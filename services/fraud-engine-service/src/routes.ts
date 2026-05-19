/**
 * Fraud-engine HTTP routes — investigator workqueue UI.
 *
 *   GET  /api/v1/fraud/cases               — list cases (risk_score DESC)
 *   GET  /api/v1/fraud/cases/:id           — single case
 *   POST /api/v1/fraud/cases/:id/resolve   — close case with outcome + notes
 *   POST /api/v1/fraud/cases/:id/assign    — assign case to investigator
 *   POST /api/v1/fraud/rings/scan          — trigger GNN ring-detection pass
 *   POST /api/v1/fraud/override            — log human AI override → fraud-detection
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth,
  requireRole,
  auditLog,
  emitEvent,
  ValidationError,
  NotFoundError,
} from '@medguard360/shared';
import {
  listFraudCases,
  getFraudCase,
  resolveCase,
  assignCase,
} from './repository';
import { fraudDetection } from './clients';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const ResolveSchema = z.object({
  status:  z.enum(['cleared', 'confirmed_fraud']),
  notes:   z.string().min(10).max(5000),
});

const AssignSchema = z.object({
  investigatorId: z.string().uuid(),
});

const OverrideSchema = z.object({
  claimId:          z.string().uuid(),
  aiRecommendation: z.string(),
  aiScore:          z.number(),
  humanDecision:    z.string(),
  explanation:      z.string().min(10),
});

const ListQuerySchema = z.object({
  status:     z.string().optional(),
  stateCode:  z.string().length(2).optional(),
  riskLevel:  z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  limit:      z.coerce.number().int().min(1).max(200).optional(),
  offset:     z.coerce.number().int().min(0).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError('Invalid input', r.error.flatten());
  return r.data;
}

const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

// ─── Router ───────────────────────────────────────────────────────────────────

export const router = Router();

// GET /fraud/cases — list cases sorted by risk_score DESC
router.get(
  '/fraud/cases',
  requireAuth,
  requireRole('fraud_investigator', 'compliance_officer', 'platform_administrator'),
  ah(async (req, res) => {
    const q = parse(ListQuerySchema, req.query);
    const result = await listFraudCases({
      status:     q.status,
      stateCode:  q.stateCode,
      riskLevel:  q.riskLevel,
      assignedTo: q.assignedTo,
      limit:      q.limit,
      offset:     q.offset,
    });

    await auditLog({
      resource: 'fraud_cases', resourceId: 'list', action: 'read',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      phiAccessed: true,
    });

    res.json(result);
  }),
);

// GET /fraud/cases/:id — get single case
router.get(
  '/fraud/cases/:id',
  requireAuth,
  requireRole('fraud_investigator', 'compliance_officer'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const fraudCase = await getFraudCase(id);
    if (!fraudCase) throw new NotFoundError('FraudCase');

    await auditLog({
      resource: 'fraud_case', resourceId: id, action: 'read',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      phiAccessed: true,
    });

    res.json(fraudCase);
  }),
);

// POST /fraud/cases/:id/resolve — investigator closes a case
router.post(
  '/fraud/cases/:id/resolve',
  requireAuth,
  requireRole('fraud_investigator'),
  ah(async (req, res) => {
    const id    = z.string().uuid().parse(req.params.id);
    const input = parse(ResolveSchema, req.body);

    const resolved = await resolveCase(id, req.auth!.sub, input.status, input.notes);

    await emitEvent(
      'fraud.case.resolved',
      { caseId: id, status: input.status, claimId: resolved.claim_id },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId },
    );

    await auditLog({
      resource: 'fraud_case', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      phiAccessed: true,
      context: { status: input.status },
    });

    res.json(resolved);
  }),
);

// POST /fraud/cases/:id/assign — assign to an investigator
router.post(
  '/fraud/cases/:id/assign',
  requireAuth,
  requireRole('fraud_investigator', 'compliance_officer'),
  ah(async (req, res) => {
    const id    = z.string().uuid().parse(req.params.id);
    const input = parse(AssignSchema, req.body);

    const updated = await assignCase(id, input.investigatorId);

    await auditLog({
      resource: 'fraud_case', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { assigned_to: input.investigatorId },
    });

    res.json(updated);
  }),
);

// POST /fraud/rings/scan — trigger GNN fraud-ring detection
router.post(
  '/fraud/rings/scan',
  requireAuth,
  requireRole('fraud_investigator', 'compliance_officer', 'platform_administrator'),
  ah(async (req, res) => {
    const { runRingScan } = await import('./ringScan');
    const windowDays  = Number.parseInt(String(req.query.windowDays  ?? '30'), 10);
    const minRingSize = Number.parseInt(String(req.query.minRingSize ?? '3'), 10);
    const result = await runRingScan(windowDays, minRingSize);

    for (const ring of result.rings) {
      await emitEvent(
        'fraud.ring.detected',
        {
          size:             ring.size,
          suspicionScore:   ring.suspicion_score,
          sharedAttributes: ring.shared_attributes,
          members:          ring.members,
          engineVersion:    result.engine_version,
        },
        { actorUserId: req.auth!.sub, correlationId: req.correlationId },
      );
    }

    await auditLog({
      resource: 'fraud_ring_scan', resourceId: 'snapshot', action: 'read',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      phiAccessed: true,
      context: { windowDays, ringsFound: result.rings.length, totalNodes: result.total_nodes },
    });

    res.json(result);
  }),
);

// POST /fraud/override — log investigator AI override → fraud-detection retraining queue
router.post(
  '/fraud/override',
  requireAuth,
  requireRole('fraud_investigator', 'compliance_officer'),
  ah(async (req, res) => {
    const input = parse(OverrideSchema, req.body);

    try {
      await fraudDetection.post('/v1/override-log', {
        ...input,
        human_reviewer_id: req.auth!.sub,
      });
    } catch {
      // Best-effort — never block the reviewer on AI engine availability.
    }

    await auditLog({
      resource: 'fraud_score', resourceId: input.claimId, action: 'override',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      phiAccessed: true,
      context: input,
    });

    res.status(204).send();
  }),
);
