/**
 *   POST /eligibility/check       — main endpoint: cache → MMIS → AI fallback
 *   GET  /eligibility/checks/:id  — read one
 *   POST /eligibility/predict     — AI-only quick check (no MMIS round-trip)
 */

import axios from 'axios';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth, requireRole, auditLog, emitEvent, ValidationError, logger, UpstreamError, config,
} from '@medguard360/shared';
import * as repo from './repository';
import { lookupMmis } from './mmis';

const eligibilityIntel = axios.create({
  baseURL: 'http://localhost:8010', timeout: 5000,
  headers: { 'x-service-caller': config.serviceName },
});
eligibilityIntel.interceptors.response.use(r => r, err => Promise.reject(new UpstreamError('eligibility-intel', err.message)));

const CheckSchema = z.object({
  patientId: z.string().uuid(),
  stateCode: z.string().length(2),
  payerId: z.string().min(1),
  coverageType: z.enum(['medicaid','medicare','chip','commercial']).default('medicaid'),
  patientFirstName: z.string().optional(),
  patientLastName: z.string().optional(),
  patientDateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  medicaidId: z.string().optional(),
  forceRefresh: z.boolean().default(false),
});

const PredictSchema = z.object({
  stateCode: z.string().length(2),
  patientAge: z.number().int().min(0).max(130),
  householdIncomeAnnualCents: z.number().int().nonnegative().optional(),
  pregnant: z.boolean().default(false),
  disabled: z.boolean().default(false),
  medicaidId: z.string().optional(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError('Invalid input', r.error.flatten());
  return r.data;
}
const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => { fn(req, res, next).catch(next); };

export const router = Router();

router.post('/eligibility/check',
  requireAuth,
  requireRole('individual_provider','facility_provider','billing_manager','prior_auth_specialist','platform_administrator'),
  ah(async (req, res) => {
    const input = parse(CheckSchema, req.body);

    // 1. Cache hit (24h TTL)
    if (!input.forceRefresh) {
      const cached = await repo.findFreshCache(req.auth!, input.patientId, input.payerId, input.stateCode);
      if (cached) {
        await emitEvent('eligibility.checked', {
          patientId: input.patientId, payerId: input.payerId, stateCode: input.stateCode,
          active: cached.active, source: 'cache',
        }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });
        return res.json({ ...cached, cacheHit: true });
      }
    }

    // 2. Try MMIS 270/271
    let row;
    try {
      const mmis = await lookupMmis(
        {
          stateCode: input.stateCode, payerId: input.payerId,
          patientFirstName: input.patientFirstName, patientLastName: input.patientLastName,
          patientDateOfBirth: input.patientDateOfBirth, medicaidId: input.medicaidId,
        },
        req.header('authorization') ?? '',
      );
      if (mmis) {
        row = await repo.persist(req.auth!, {
          patientId: input.patientId, stateCode: input.stateCode, payerId: input.payerId,
          coverageType: input.coverageType, source: 'mmis_270_271',
          active: mmis.active,
          effectiveFrom: mmis.effectiveFrom, effectiveTo: mmis.effectiveTo,
          planName: mmis.planName,
          copayCents: mmis.copayCents, deductibleRemainingCents: mmis.deductibleRemainingCents,
          details: mmis.raw,
        });
      }
    } catch (err) {
      logger.warn('MMIS lookup failed; falling back to AI prediction', {
        stateCode: input.stateCode, error: (err as Error).message,
      });
    }

    // 3. If MMIS failed, fall back to AI prediction so the workflow doesn't block.
    if (!row) {
      try {
        const pred = await eligibilityIntel.post<{
          likely_eligible: boolean; probability: number; suggested_program: string;
          benefits: unknown[]; explanation: string; engine_version: string;
        }>('/v1/predict', {
          state_code: input.stateCode, patient_age: 30,    // dev placeholder; real flow joins patient-service
          medicaid_id: input.medicaidId,
        });
        row = await repo.persist(req.auth!, {
          patientId: input.patientId, stateCode: input.stateCode, payerId: input.payerId,
          coverageType: input.coverageType, source: 'ai_prediction',
          active: pred.data.likely_eligible,
          planName: pred.data.suggested_program,
          details: { ai: pred.data },
        });
      } catch (err) {
        logger.error('both MMIS and AI fallback failed', { error: (err as Error).message });
        throw err;
      }
    }

    await emitEvent('eligibility.checked', {
      patientId: input.patientId, payerId: input.payerId, stateCode: input.stateCode,
      active: row.active, source: row.source,
    }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });

    await auditLog({
      resource: 'eligibility_check', resourceId: row.id, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { source: row.source, active: row.active },
    });

    res.json({ ...row, cacheHit: false });
  }),
);

router.get('/eligibility/checks/:id', requireAuth, ah(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const row = await repo.getOne(req.auth!, id);
  res.json(row);
}));

router.post('/eligibility/predict',
  requireAuth,
  requireRole('individual_provider','facility_provider','billing_manager','prior_auth_specialist','platform_administrator'),
  ah(async (req, res) => {
    const input = parse(PredictSchema, req.body);
    const pred = await eligibilityIntel.post('/v1/predict', {
      state_code: input.stateCode, patient_age: input.patientAge,
      household_income_annual_cents: input.householdIncomeAnnualCents,
      pregnant: input.pregnant, disabled: input.disabled,
      medicaid_id: input.medicaidId,
    });
    res.json(pred.data);
  }),
);
