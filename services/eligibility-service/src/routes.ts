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
import * as hets from './hets';
import * as ce from './communityEngagement';

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
          coverageType: input.coverageType,
          patientFirstName: input.patientFirstName, patientLastName: input.patientLastName,
          patientDateOfBirth: input.patientDateOfBirth, medicaidId: input.medicaidId,
        },
        req.header('authorization') ?? '',
      );
      if (mmis) {
        row = await repo.persist(req.auth!, {
          patientId: input.patientId, stateCode: input.stateCode, payerId: input.payerId,
          coverageType: input.coverageType, source: mmis.source ?? 'mmis_270_271',
          active: mmis.active,
          effectiveFrom: mmis.effectiveFrom, effectiveTo: mmis.effectiveTo,
          planName: mmis.planName,
          copayCents: mmis.copayCents, deductibleRemainingCents: mmis.deductibleRemainingCents,
          details: mmis.raw,
        });
      }
    } catch (err) {
      if (err instanceof UpstreamError && err.message.startsWith('NCTracks:')) {
        throw err;
      }
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

/**
 * GET /eligibility/hets-status?npi=...&stateCode=...&status=...
 * Returns HETS attestation status for the given NPI under MedGuard360's
 * HETS Submitter UID. Either pass `npi` for a single lookup or use stateCode/
 * status as filters for the compliance dashboard listing.
 */
router.get('/eligibility/hets-status',
  requireAuth,
  ah(async (req, res) => {
    const submitterUid = process.env.HETS_SUBMITTER_UID ?? 'MEDGUARD360_PENDING_UID';
    const q = z.object({
      npi: z.string().regex(/^\d{10}$/).optional(),
      stateCode: z.string().length(2).toUpperCase().optional(),
      status: z.enum(['not_started','pending','attested','revoked','rejected']).optional(),
    }).parse(req.query);
    if (q.npi) {
      const enr = await hets.getEnrollment(q.npi, submitterUid);
      const allowed = enr?.attestation_status === 'attested';
      res.json({
        npi: q.npi,
        hetsSubmitterUid: submitterUid,
        enrollment: enr,
        medicareEligibilityAllowed: allowed,
        blockReason: allowed ? null : 'HETS attestation incomplete — Medicare 270/271 requests will be rejected with AAA 41 until provider attests their NPI under MedGuard360 HETS UID.',
      });
      return;
    }
    const rows = await hets.listEnrollments({ stateCode: q.stateCode, status: q.status });
    res.json({ submitterUid, count: rows.length, enrollments: rows });
  }),
);

router.post('/eligibility/hets-status/upsert',
  requireAuth,
  requireRole('platform_administrator','credentialing_specialist','state_medicaid_agency'),
  ah(async (req, res) => {
    const submitterUid = process.env.HETS_SUBMITTER_UID ?? 'MEDGUARD360_PENDING_UID';
    const body = z.object({
      providerId: z.string().uuid(),
      npi: z.string().regex(/^\d{10}$/),
      status: z.enum(['not_started','pending','attested','revoked','rejected']),
      notes: z.string().max(2000).optional(),
    }).parse(req.body);
    const row = await hets.upsertEnrollment({
      providerId: body.providerId, npi: body.npi,
      hetsSubmitterUid: submitterUid, status: body.status, notes: body.notes,
    });
    await auditLog({
      resource: 'hets_enrollment', resourceId: row.id, action: 'write',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { npi: body.npi, status: body.status },
    });
    res.json(row);
  }),
);

/**
 * Community Engagement Verification (WFTC H.R. 1) — mandatory 2027-01-01.
 *   POST /eligibility/community-engagement/verify    — submit a new period's hours/exemption
 *   GET  /eligibility/community-engagement/:patientId — full status summary + history
 *   GET  /eligibility/community-engagement/overdue/list — state-agency dashboard list
 */
router.post('/eligibility/community-engagement/verify',
  requireAuth,
  ah(async (req, res) => {
    const body = z.object({
      patientId: z.string().uuid(),
      stateCode: z.string().length(2).toUpperCase(),
      reportingPeriod: z.string().regex(/^\d{4}-\d{2}$/),
      hoursDocumented: z.number().int().min(0).max(744),
      engagementType: z.enum([
        'employed','self_employed','job_training','education','volunteer','caregiving',
        'medically_exempt','disabled_exempt','pregnant_exempt','age_exempt_under19',
        'age_exempt_over64','tribal_exempt',
      ]),
      exemptionCode: z.enum(['medical','disability','pregnancy','caregiver','tribal','good_faith_delay']).optional(),
      verificationSource: z.enum([
        'payroll_attestation','employer_attestation','school_enrollment','volunteer_org',
        'medical_provider','tribal_affirmation','self_attestation','irs_data','swic_data',
      ]),
      notes: z.string().max(2000).optional(),
    }).parse(req.body);
    const row = await ce.submitRecord({ ...body, createdBy: req.auth!.sub });
    await auditLog({
      resource: 'community_engagement_record', resourceId: row.id, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { type: body.engagementType, hours: body.hoursDocumented, source: body.verificationSource },
    });
    await emitEvent('community.engagement.submitted', {
      patientId: body.patientId, stateCode: body.stateCode, status: row.status,
      hoursDocumented: body.hoursDocumented, engagementType: body.engagementType,
    }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    res.status(201).json(row);
  }),
);

router.get('/eligibility/community-engagement/overdue/list',
  requireAuth,
  requireRole('state_medicaid_agency','federal_cms','compliance_officer','platform_administrator','mco_admin'),
  ah(async (req, res) => {
    const q = z.object({ stateCode: z.string().length(2).toUpperCase().optional() }).parse(req.query);
    const rows = await ce.listOverdue(q.stateCode);
    res.json({ count: rows.length, rows });
  }),
);

router.get('/eligibility/community-engagement/:patientId',
  requireAuth,
  ah(async (req, res) => {
    const patientId = z.string().uuid().parse(req.params.patientId);
    const summary = await ce.getEngagementSummary(patientId);
    await auditLog({
      resource: 'community_engagement_summary', resourceId: patientId, action: 'read',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
    });
    res.json(summary);
  }),
);

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
