/**
 * prior-auth-service routes
 *
 *   POST /api/v1/prior-auth/pa-requests             — submit a PA request (provider roles)
 *   GET  /api/v1/prior-auth/pa-requests             — list PA requests (specialist / billing roles)
 *   GET  /api/v1/prior-auth/pa-requests/queue       — active SLA-sorted queue (specialist)
 *   GET  /api/v1/prior-auth/pa-requests/:id         — get PA + criterion evaluations
 *   POST /api/v1/prior-auth/pa-requests/:id/decide  — human decision (prior_auth_specialist)
 *
 * Path convention: `/prior-auth/pa-requests/*`. Frontend and nginx (location
 * `/api/v1/prior-auth/`) consistently use this prefix; routes.ts was historically
 * mounted at `/pa` which caused a path-convention drift — unified 2026-05-22.
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
  createLogger,
  pool,
} from '@medguard360/shared';
import * as repo from './repository';
import { runClinicalDecisionEngine, computeDueAt } from './engine';

const logger = createLogger('prior-auth-service:routes');

// ── Zod schemas ──────────────────────────────────────────────────────────────

const CreatePaSchema = z.object({
  patient_id: z.string().uuid(),
  procedure_code: z.string().min(1).max(20),
  diagnosis_codes: z.array(z.string().min(1)).min(1).max(12),
  clinical_justification: z.string().min(10).max(10_000),
  urgency: z.enum(['standard', 'expedited', 'drug']),
  state_code: z.string().length(2),
  payer_id: z.string().min(1),
});

const ListPaSchema = z.object({
  status: z.string().optional(),
  state_code: z.string().length(2).optional(),
  provider_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const DecideSchema = z.object({
  decision: z.enum(['approved', 'denied', 'needs_more_info']),
  notes: z.string().min(10).max(5_000),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError('Invalid input', result.error.flatten());
  return result.data;
}

const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

// ── Router ───────────────────────────────────────────────────────────────────

export const router = Router();

/**
 * POST /api/v1/prior-auth/pa-requests
 * Create a PA request, run the clinical decision engine asynchronously,
 * emit pa.submitted Kafka event, return PA with AI recommendation.
 */
router.post(
  '/prior-auth/pa-requests',
  requireAuth,
  requireRole(
    'individual_provider',
    'facility_provider',
    'prior_auth_specialist',
    'billing_manager',
  ),
  ah(async (req, res) => {
    const body = parse(CreatePaSchema, req.body);
    const auth = req.auth!;
    const dueAt = computeDueAt(body.urgency);

    // Persist initial pending request
    const paRequest = await repo.createPaRequest({
      patient_id: body.patient_id,
      provider_user_id: auth.sub,
      state_code: body.state_code,
      payer_id: body.payer_id,
      procedure_code: body.procedure_code,
      diagnosis_codes: body.diagnosis_codes,
      clinical_justification: body.clinical_justification,
      urgency: body.urgency,
      status: 'pending',
      ai_recommendation: null,
      ai_confidence: null,
      ai_explanation: null,
      human_reviewer_id: null,
      human_decision: null,
      human_notes: null,
      due_at: dueAt,
      decided_at: null,
      created_by: auth.sub,
    });

    // Emit pa.submitted event immediately so consumers can react
    await emitEvent('pa.submitted', {
      paRequestId: paRequest.id,
      patientId: body.patient_id,
      providerId: auth.sub,
      procedureCode: body.procedure_code,
      diagnosisCodes: body.diagnosis_codes,
      urgency: body.urgency,
      stateCode: body.state_code,
      payerId: body.payer_id,
      dueAt: dueAt.toISOString(),
    });

    // Run clinical decision engine — async but we await before responding
    // so the provider gets the AI recommendation immediately.
    let engineResult;
    try {
      engineResult = await runClinicalDecisionEngine({
        procedureCode: body.procedure_code,
        diagnosisCodes: body.diagnosis_codes,
        clinicalJustification: body.clinical_justification,
        urgency: body.urgency,
        stateCode: body.state_code,
        payerId: body.payer_id,
      });
    } catch (err) {
      logger.error('clinical decision engine threw unexpectedly', { error: (err as Error).message });
      engineResult = {
        recommendation: 'needs_more_info' as const,
        confidence: 0,
        explanation: 'AI engine encountered an error — routing to manual review.',
        criteriaEvaluations: [],
        routedToHuman: true,
      };
    }

    // Persist AI results; status stays pending for human decision
    const updated = await repo.updatePaRequest(paRequest.id, {
      ai_recommendation: engineResult.recommendation,
      ai_confidence: engineResult.confidence,
      ai_explanation: engineResult.explanation,
    });

    // Save criterion-level evaluations
    if (engineResult.criteriaEvaluations.length) {
      await repo.saveCriterionEvaluations(
        paRequest.id,
        engineResult.criteriaEvaluations.map(ce => ({
          criterion_text: ce.criterionText,
          similarity_score: ce.similarityScore,
          outcome: ce.outcome,
          explanation: ce.explanation,
        })),
      );
    }

    await auditLog({
      resource: 'pa_request',
      resourceId: paRequest.id,
      action: 'create',
      actor: auth,
      outcome: 'success',
      context: {
        urgency: body.urgency,
        dueAt: dueAt.toISOString(),
        aiRecommendation: engineResult.recommendation,
        aiConfidence: engineResult.confidence,
        routedToHuman: engineResult.routedToHuman,
      },
    });

    res.status(201).json({
      paRequest: updated,
      aiRecommendation: engineResult.recommendation,
      aiConfidence: engineResult.confidence,
      aiExplanation: engineResult.explanation,
      criteriaEvaluations: engineResult.criteriaEvaluations,
      routedToHuman: engineResult.routedToHuman,
      dueAt: dueAt.toISOString(),
    });
  }),
);

/**
 * GET /api/v1/prior-auth/pa-requests/queue
 * Active SLA-sorted queue for the specialist UI. Returns pending +
 * needs_more_info statuses, ordered by urgency (drug → expedited → standard),
 * then by due_at ASC. The frontend renders SLA chips off these fields.
 *
 * Mounted before the generic list+show routes so the literal "queue" doesn't
 * get matched as :id.
 */
router.get(
  '/prior-auth/pa-requests/queue',
  requireAuth,
  requireRole('prior_auth_specialist', 'billing_manager', 'compliance_officer'),
  ah(async (_req, res) => {
    // Pull active items from both buckets — repo's list filters one status at a
    // time, so concatenate and sort in-process. Volume is bounded (queue is for
    // humans to work through), so this is fine.
    const pending = await repo.listPaRequests({ status: 'pending',          limit: 500 });
    const moreInfo = await repo.listPaRequests({ status: 'needs_more_info', limit: 500 });
    const urgencyRank: Record<string, number> = { drug: 0, expedited: 1, standard: 2 };
    const requests = [...pending, ...moreInfo].sort((a, b) => {
      const ur = (urgencyRank[a.urgency] ?? 99) - (urgencyRank[b.urgency] ?? 99);
      if (ur !== 0) return ur;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });
    res.json({ requests, count: requests.length });
  }),
);

/**
 * GET /api/v1/prior-auth/pa-requests
 * List PA requests with optional filters.
 */
router.get(
  '/prior-auth/pa-requests',
  requireAuth,
  requireRole('prior_auth_specialist', 'billing_manager', 'compliance_officer'),
  ah(async (req, res) => {
    const query = parse(ListPaSchema, req.query);

    const rows = await repo.listPaRequests({
      status: query.status,
      stateCode: query.state_code,
      providerId: query.provider_id,
      limit: query.limit,
      offset: query.offset,
    });

    // Frontend expects `requests` per convention; keep `paRequests` + `count`
    // as legacy aliases until consumers are migrated.
    res.json({ requests: rows, paRequests: rows, count: rows.length });
  }),
);

/**
 * GET /api/v1/prior-auth/pa-requests/:id
 * Get PA request with criterion evaluations.
 */
router.get(
  '/prior-auth/pa-requests/:id',
  requireAuth,
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const auth = req.auth!;

    const paRequest = await repo.findPaRequest(id);
    if (!paRequest) throw new NotFoundError('PA request');

    // Fetch criterion evaluations
    const evalResult = await pool.query(
      `SELECT id, pa_request_id, criterion_text, similarity_score, outcome, explanation, created_at
       FROM pa_criterion_evaluations
       WHERE pa_request_id = $1
       ORDER BY created_at`,
      [id],
    );

    await auditLog({
      resource: 'pa_request',
      resourceId: id,
      action: 'read',
      actor: auth,
      outcome: 'success',
    });

    res.json({
      paRequest,
      criteriaEvaluations: evalResult.rows,
    });
  }),
);

/**
 * POST /api/v1/prior-auth/pa-requests/:id/decide
 * Human specialist makes the final decision on a PA request.
 */
router.post(
  '/prior-auth/pa-requests/:id/decide',
  requireAuth,
  requireRole('prior_auth_specialist'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const auth = req.auth!;
    const body = parse(DecideSchema, req.body);

    const existing = await repo.findPaRequest(id);
    if (!existing) throw new NotFoundError('PA request');

    // Map decision to status
    const statusMap: Record<string, PaRequestStatusPending> = {
      approved: 'approved',
      denied: 'denied',
      needs_more_info: 'needs_more_info',
    };

    const updated = await repo.updatePaRequest(id, {
      status: statusMap[body.decision] as 'approved' | 'denied' | 'needs_more_info',
      human_reviewer_id: auth.sub,
      human_decision: body.decision,
      human_notes: body.notes,
      decided_at: new Date(),
    });

    const eventType =
      body.decision === 'approved'
        ? 'pa.decided.approved'
        : body.decision === 'denied'
          ? 'pa.decided.denied'
          : 'pa.decided.needs_more_info';

    await emitEvent(eventType, {
      paRequestId: id,
      patientId: existing.patient_id,
      providerId: existing.provider_user_id,
      reviewerId: auth.sub,
      decision: body.decision,
      notes: body.notes,
      decidedAt: new Date().toISOString(),
    });

    await auditLog({
      resource: 'pa_request',
      resourceId: id,
      action: 'update',
      actor: auth,
      outcome: 'success',
      context: {
        decision: body.decision,
        notes: body.notes,
      },
    });

    res.json({ paRequest: updated });
  }),
);

// Utility type to satisfy TS; avoids circular reference with PaRequestRow.status
type PaRequestStatusPending = 'pending' | 'approved' | 'denied' | 'needs_more_info' | 'expired';
