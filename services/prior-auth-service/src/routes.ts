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
import { getDaVinciPasAdapter } from '@medguard360/shared';
import * as drugPa from './drugPa';

const logger = createLogger('prior-auth-service:routes');

// ── Zod schemas ──────────────────────────────────────────────────────────────

const CreatePaSchema = z.object({
  patient_id: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  procedure_code: z.string().min(1).max(20).optional(),
  serviceCode: z.string().min(1).max(20).optional(),
  service_code_type: z.enum(['CPT', 'HCPCS', 'NDC', 'REVENUE']).optional(),
  serviceCodeType: z.enum(['CPT', 'HCPCS', 'NDC', 'REVENUE']).optional(),
  service_description: z.string().max(500).optional(),
  serviceDescription: z.string().max(500).optional(),
  diagnosis_codes: z.array(z.string().min(1)).min(1).max(12).optional(),
  diagnosisCodes: z.array(z.string().min(1)).min(1).max(12).optional(),
  clinical_justification: z.string().min(10).max(10_000).optional(),
  urgency: z.enum(['standard', 'expedited', 'drug']),
  state_code: z.string().length(2).optional(),
  stateCode: z.string().length(2).optional(),
  payer_id: z.string().min(1).optional(),
  payerId: z.string().min(1).optional(),
  clinical_doc_id: z.string().uuid().optional(),
  clinicalDocId: z.string().uuid().optional(),
}).transform((b) => {
  const patientId = b.patient_id ?? b.patientId;
  const serviceCode = b.procedure_code ?? b.serviceCode;
  const diagnosisCodes = b.diagnosis_codes ?? b.diagnosisCodes;
  const stateCode = b.state_code ?? b.stateCode;
  const payerId = b.payer_id ?? b.payerId;
  if (!patientId || !serviceCode || !diagnosisCodes?.length || !stateCode || !payerId) {
    throw new ValidationError('Invalid input', { fieldErrors: { _errors: ['patientId, serviceCode, diagnosisCodes, stateCode, and payerId are required'] } });
  }
  const description = b.service_description ?? b.serviceDescription ?? serviceCode;
  const justification = b.clinical_justification ?? description;
  return {
    patient_id: patientId,
    procedure_code: serviceCode,
    service_code_type: b.service_code_type ?? b.serviceCodeType ?? 'CPT',
    service_description: description,
    diagnosis_codes: diagnosisCodes,
    clinical_justification: justification,
    urgency: b.urgency,
    state_code: stateCode,
    payer_id: payerId,
    clinical_doc_id: b.clinical_doc_id ?? b.clinicalDocId ?? null,
  };
});

const ListPaSchema = z.object({
  status: z.string().optional(),
  state_code: z.string().length(2).optional(),
  provider_id: z.string().uuid().optional(),
  service_code_type: z.enum(['CPT', 'HCPCS', 'NDC', 'REVENUE']).optional(),
  serviceCodeType: z.enum(['CPT', 'HCPCS', 'NDC', 'REVENUE']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
}).transform(b => ({
  status: b.status,
  state_code: b.state_code,
  provider_id: b.provider_id,
  service_code_type: b.service_code_type ?? b.serviceCodeType,
  limit: b.limit,
  offset: b.offset,
}));

const DecideSchema = z.object({
  decision: z.enum(['approved', 'denied', 'needs_more_info']),
  notes: z.string().min(10).max(5_000),
});

/**
 * Investigators send 'unclear' from the UI; the canonical DB value is
 * 'indeterminate'. Normalize at the API boundary so the DB never sees
 * 'unclear'.
 */
const OverrideSchema = z.object({
  outcome: z.enum(['met', 'not_met', 'unclear', 'indeterminate'])
            .transform(v => v === 'unclear' ? 'indeterminate' : v),
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
 * GET /api/v1/prior-auth/drug-pa/formulary-check?payerId=&ndcCode=
 * Pre-PA formulary tier check. If drug is preferred + no PA flag → no PA needed.
 * Pharmacy / EHR calls this before initiating a drug PA workflow.
 */
router.get(
  '/prior-auth/drug-pa/formulary-check',
  requireAuth,
  ah(async (req, res) => {
    const q = z.object({
      payerId: z.string().min(1).max(50),
      ndcCode: z.string().regex(/^\d{4,5}-\d{3,4}-\d{1,2}$/),
    }).parse(req.query);
    const result = await drugPa.checkFormulary(q.payerId, q.ndcCode);
    res.json(result);
  }),
);

/**
 * POST /api/v1/prior-auth/drug-pa
 * Create a drug-type PA request. Uses pa_requests table with service_code_type='NDC'.
 * SLA: 24h (CMS-0062-P standard). Triggers BERT criteria evaluation just like procedure PA.
 */
router.post(
  '/prior-auth/drug-pa',
  requireAuth,
  requireRole('individual_provider', 'facility_provider', 'pharmacy', 'prior_auth_specialist'),
  ah(async (req, res) => {
    const body = z.object({
      patientId: z.string().uuid(),
      orderingProviderUserId: z.string().uuid(),
      pharmacyProviderId: z.string().uuid().optional(),
      payerId: z.string().min(1),
      stateCode: z.string().length(2).toUpperCase(),
      ndcCode: z.string().regex(/^\d{4,5}-\d{3,4}-\d{1,2}$/),
      drugName: z.string().min(1).max(200),
      daysSupply: z.number().int().positive().max(365),
      quantity: z.number().positive(),
      diagnosisCodes: z.array(z.string()).min(1),
      priorDrugTrials: z.array(z.object({
        ndcCode: z.string(), drugName: z.string(),
        outcome: z.enum(['failed','intolerant','contraindicated']),
        durationDays: z.number().int().positive(),
      })).optional(),
      urgency: z.enum(['standard','expedited','drug']).default('drug'),
      ncpdpMessageId: z.string().optional(),
    }).parse(req.body);

    // 1. Formulary tier check — if drug is preferred and no PA flag, return early
    const fc = await drugPa.checkFormulary(body.payerId, body.ndcCode);
    if (!fc.pa_required) {
      res.json({ paRequired: false, formulary: fc, message: 'No PA required for this drug under this payer\'s formulary.' });
      return;
    }

    // 2. Step therapy gate — block PA submission if step therapy required and no prior trials documented
    if (fc.step_therapy_required && (!body.priorDrugTrials || body.priorDrugTrials.length === 0)) {
      res.status(422).json({
        error: 'STEP_THERAPY_REQUIRED',
        message: 'Step therapy required for this drug. Document prior trials in priorDrugTrials before submission.',
        formulary: fc,
      });
      return;
    }

    // 3. Create PA row (uses repo.createPaRequest with drug-specific fields)
    const dueAt = computeDueAt(body.urgency);
    const result = await pool.query(
      `INSERT INTO pa_requests (
         patient_id, ordering_provider_id, payer_id, state_code,
         service_code, service_code_type, service_description, diagnosis_codes,
         urgency, status, due_at, created_by,
         days_supply, quantity, pharmacy_provider_id, prior_drug_trials,
         formulary_tier, step_therapy_required, ncpdp_message_id
       ) VALUES ($1,$2,$3,$4, $5,'NDC',$6,$7, $8,'received',$9,$10, $11,$12,$13,$14::jsonb, $15,$16,$17)
       RETURNING id`,
      [
        body.patientId, body.orderingProviderUserId, body.payerId, body.stateCode,
        body.ndcCode, body.drugName, body.diagnosisCodes,
        body.urgency, dueAt, req.auth!.sub,
        body.daysSupply, body.quantity, body.pharmacyProviderId ?? null,
        JSON.stringify(body.priorDrugTrials ?? []),
        fc.entry?.tier ?? null, fc.step_therapy_required, body.ncpdpMessageId ?? null,
      ],
    );
    const paId = result.rows[0].id;

    await auditLog({
      resource: 'pa_request', resourceId: paId, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { kind: 'drug_pa', ndc: body.ndcCode, payer: body.payerId, tier: fc.entry?.tier },
    });
    await emitEvent('pa.requested', {
      paId, kind: 'drug', patientId: body.patientId, payerId: body.payerId,
      stateCode: body.stateCode, ndcCode: body.ndcCode, urgency: body.urgency,
      dueAt: dueAt.toISOString(),
    }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });

    res.status(201).json({
      paId, paRequired: true, formulary: fc,
      dueAt: dueAt.toISOString(),
      message: 'Drug PA submitted; awaiting BERT criteria evaluation + pharmacist review.',
    });
  }),
);

/**
 * POST /api/v1/prior-auth/pa-requests/crd-check
 * Da Vinci CRD (Coverage Requirements Discovery) — ask the payer whether a
 * specific service code requires PA, BEFORE the provider builds the PA request.
 * Lets the EHR short-circuit unnecessary PA workflows.
 *
 * Body: { payerEndpoint, serviceCode, patientId, providerUserId }
 * Returns: { priorAuthRequired, documentationRequired[], reasonText }
 */
router.post(
  '/prior-auth/pa-requests/crd-check',
  requireAuth,
  requireRole('individual_provider', 'facility_provider', 'prior_auth_specialist'),
  ah(async (req, res) => {
    const schema = z.object({
      payerEndpoint: z.string().url(),
      serviceCode:   z.string().min(1).max(20),
      patientId:     z.string().uuid(),
      providerUserId:z.string().uuid(),
    });
    const body = schema.parse(req.body);
    const adapter = getDaVinciPasAdapter();
    const out = await adapter.crdCheck({
      payerEndpoint: body.payerEndpoint,
      serviceCode:   body.serviceCode,
      patientFhirRef:    `Patient/${body.patientId}`,
      practitionerFhirRef: `Practitioner/${body.providerUserId}`,
    });
    await auditLog({
      resource: 'pa_crd_check', resourceId: body.serviceCode, action: 'read',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
    });
    res.json(out);
  }),
);

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
      service_code_type: body.service_code_type,
      service_description: body.service_description,
      diagnosis_codes: body.diagnosis_codes,
      clinical_justification: body.clinical_justification,
      clinical_doc_id: body.clinical_doc_id,
      urgency: body.urgency,
      status: 'received',
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

    // Emit pa.requested event immediately so consumers can react
    await emitEvent('pa.requested', {
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
        authorizationHeader: req.header('authorization') ?? undefined,
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
  requireRole('prior_auth_specialist', 'billing_manager', 'compliance_officer', 'platform_administrator'),
  ah(async (_req, res) => {
    // Pull active items from both buckets — repo's list filters one status at a
    // time, so concatenate and sort in-process. Volume is bounded (queue is for
    // humans to work through), so this is fine.
    const [received, evaluating, moreInfo] = await Promise.all([
      repo.listPaRequests({ status: 'received', limit: 500 }),
      repo.listPaRequests({ status: 'evaluating', limit: 500 }),
      repo.listPaRequests({ status: 'needs_more_info', limit: 500 }),
    ]);
    const urgencyRank: Record<string, number> = { drug: 0, expedited: 1, standard: 2 };
    const requests = [...received, ...evaluating, ...moreInfo].sort((a, b) => {
      const ur = (urgencyRank[a.urgency] ?? 99) - (urgencyRank[b.urgency] ?? 99);
      if (ur !== 0) return ur;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });
    res.json({ requests, count: requests.length });
  }),
);

/**
 * GET /api/v1/prior-auth/pa-requests/decided
 * Approved / denied history for the specialist "Decided" tab.
 */
router.get(
  '/prior-auth/pa-requests/decided',
  requireAuth,
  requireRole('prior_auth_specialist', 'billing_manager', 'compliance_officer', 'platform_administrator'),
  ah(async (_req, res) => {
    const [approved, denied] = await Promise.all([
      repo.listPaRequests({ status: 'approved', limit: 200 }),
      repo.listPaRequests({ status: 'denied', limit: 200 }),
    ]);
    const requests = [...approved, ...denied].sort(
      (a, b) => new Date((b as { decision_at?: Date }).decision_at ?? b.decided_at ?? b.updated_at).getTime()
        - new Date((a as { decision_at?: Date }).decision_at ?? a.decided_at ?? a.updated_at).getTime(),
    );
    res.json({ requests, count: requests.length });
  }),
);

/**
 * GET /api/v1/prior-auth/pa-requests/mine
 * Ordering provider's own PA requests (active + historical).
 */
router.get(
  '/prior-auth/pa-requests/mine',
  requireAuth,
  requireRole('individual_provider', 'facility_provider', 'platform_administrator'),
  ah(async (req, res) => {
    const rows = await repo.listPaRequests({ providerId: req.auth!.sub, limit: 50 });
    res.json({ requests: rows, count: rows.length });
  }),
);

/**
 * GET /api/v1/prior-auth/pa-requests
 * List PA requests with optional filters.
 */
router.get(
  '/prior-auth/pa-requests',
  requireAuth,
  requireRole('prior_auth_specialist', 'billing_manager', 'compliance_officer', 'pharmacy', 'platform_administrator'),
  ah(async (req, res) => {
    const query = parse(ListPaSchema, req.query);

    const rows = await repo.listPaRequests({
      status: query.status,
      stateCode: query.state_code,
      providerId: query.provider_id,
      serviceCodeType: query.service_code_type,
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

    // Fetch criterion evaluations — include override columns (added in 0024)
    const evalResult = await pool.query(
      `SELECT id, pa_request_id, criterion_text, similarity_score, outcome, explanation,
              human_outcome, human_outcome_at, human_reviewer_id, created_at
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
      ...paRequest,
      criteria: evalResult.rows,
      paRequest,
      criteriaEvaluations: evalResult.rows,
    });
  }),
);

/**
 * PUT /api/v1/prior-auth/pa-requests/:id/criteria/:cid/override
 * Investigator records an override on one criterion's AI outcome.
 * Persists into pa_criterion_evaluations.human_outcome (added in
 * migration 0024). Returns the updated row.
 *
 * Per CLAUDE.md AI governance: every AI output routes to human approval;
 * overrides are logged and used to retrain models quarterly. The audit
 * trail here is the (human_reviewer_id, human_outcome_at) pair.
 */
router.put(
  '/prior-auth/pa-requests/:id/criteria/:cid/override',
  requireAuth,
  requireRole('prior_auth_specialist', 'compliance_officer'),
  ah(async (req, res) => {
    const id  = z.string().uuid().parse(req.params.id);
    const cid = z.string().uuid().parse(req.params.cid);
    const body = parse(OverrideSchema, req.body);
    const auth = req.auth!;

    const updated = await repo.setCriterionOverride(id, cid, auth.sub, body.outcome);
    if (!updated) throw new NotFoundError('Criterion evaluation');

    await auditLog({
      resource: 'pa_criterion_evaluation',
      resourceId: cid,
      action: 'override',
      actor: auth,
      outcome: 'success',
      context: { pa_request_id: id, human_outcome: body.outcome },
    });

    res.json(updated);
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
      human_notes: body.notes,
      decided_at: new Date(),
    });

    const eventType =
      body.decision === 'approved'
        ? 'pa.approved'
        : body.decision === 'denied'
          ? 'pa.denied'
          : 'pa.needs.more.info';

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
