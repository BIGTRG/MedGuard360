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
  escalateCase,
  listEvents,
  recordEvent,
} from './repository';
import { fraudDetection } from './clients';
import { toPortalView } from './serialize';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const ResolveSchema = z.object({
  status:  z.enum(['cleared', 'confirmed_fraud']),
  notes:   z.string().min(10).max(5000),
});

const AssignSchema = z.object({
  investigatorId: z.string().uuid(),
});

const EscalateSchema = z.object({
  /** Target Program Integrity counterparty. NC primary pilot is OCPI. */
  target: z.enum(['OCPI', 'MFCU', 'CMS_UPIC', 'STATE_OIG']).default('OCPI'),
  /** Notes to include in the alert packet. */
  notes:  z.string().min(10).max(5000),
});

const AddEventSchema = z.object({
  /** Today only 'note' is investigator-authored. Other types are server-side. */
  eventType: z.literal('note').default('note'),
  text:      z.string().min(1).max(5000),
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

    res.json({
      cases: result.cases.map(toPortalView),
      total: result.total,
    });
  }),
);

// GET /fraud/cases/:id — get single case
router.get(
  '/fraud/cases/:id',
  requireAuth,
  requireRole('fraud_investigator', 'compliance_officer', 'platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const fraudCase = await getFraudCase(id);
    if (!fraudCase) throw new NotFoundError('FraudCase');

    await auditLog({
      resource: 'fraud_case', resourceId: id, action: 'read',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      phiAccessed: true,
    });

    res.json(toPortalView(fraudCase));
  }),
);

/**
 * GET /api/v1/fraud/cases/:id/events
 * List the append-only timeline events for one case (notes + structural
 * transitions). Ordered chronologically.
 */
router.get(
  '/fraud/cases/:id/events',
  requireAuth,
  requireRole('fraud_investigator', 'compliance_officer', 'platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    // Ensure the case exists so we 404 cleanly rather than returning [] for a
    // bogus id.
    const fc = await getFraudCase(id);
    if (!fc) throw new NotFoundError('FraudCase');
    const events = await listEvents(id);
    res.json({ events });
  }),
);

/**
 * POST /api/v1/fraud/cases/:id/events
 * Investigator records a free-text note on a case. Persisted to
 * fraud_case_events as eventType='note'.
 */
router.post(
  '/fraud/cases/:id/events',
  requireAuth,
  requireRole('fraud_investigator', 'compliance_officer'),
  ah(async (req, res) => {
    const id    = z.string().uuid().parse(req.params.id);
    const input = parse(AddEventSchema, req.body);

    const fc = await getFraudCase(id);
    if (!fc) throw new NotFoundError('FraudCase');

    const event = await recordEvent({
      caseId:      id,
      actorUserId: req.auth!.sub,
      eventType:   input.eventType,
      text:        input.text,
    });

    await auditLog({
      resource: 'fraud_case_event', resourceId: event.id, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { case_id: id, event_type: input.eventType, text_length: input.text.length },
    });

    res.status(201).json(event);
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

/**
 * POST /api/v1/fraud/cases/:id/escalate
 *
 * Hand a case upstream to a Program Integrity counterparty (OCPI / MFCU /
 * CMS UPIC / state OIG). Sets the escalation columns on fraud_cases without
 * resolving the case — investigator may still close it cleared / confirmed
 * later. Emits fraud.case.escalated so notification-service can build the
 * outbound alert packet (per `integrations/nc-enterprise/README.md §9.3`).
 */
router.post(
  '/fraud/cases/:id/escalate',
  requireAuth,
  requireRole('fraud_investigator', 'compliance_officer'),
  ah(async (req, res) => {
    const id    = z.string().uuid().parse(req.params.id);
    const input = parse(EscalateSchema, req.body);

    const updated = await escalateCase(id, req.auth!.sub, input.target, input.notes);

    await emitEvent(
      'fraud.case.escalated',
      {
        caseId:       id,
        claimId:      updated.claim_id,
        target:       input.target,
        notes:        input.notes,
        escalatedBy:  req.auth!.sub,
        riskScore:    updated.risk_score,
        stateCode:    updated.state_code,
      },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId },
    );

    await auditLog({
      resource: 'fraud_case', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { escalation_target: input.target, escalation_notes: input.notes },
    });

    res.json(updated);
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
