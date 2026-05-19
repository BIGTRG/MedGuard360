import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth, requireRole, auditLog, emitEvent, ValidationError, logger,
} from '@medguard360/shared';
import * as repo from './repository';
import { denialPredictor, clinicalDocClient } from './clients';

const ListSchema = z.object({
  status: z.array(z.enum(['received','reviewing','appealing','appeal_won','appeal_lost','write_off','expired'])).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const DraftAppealSchema = z.object({
  clinicalDocId: z.string().uuid().optional(),
  patientFirstName: z.string().optional(),
  patientLastName: z.string().optional(),
  providerName: z.string().optional(),
});

const ReviewSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

const OutcomeSchema = z.object({
  status: z.enum(['won', 'lost']),
  notes: z.string().optional(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError('Invalid input', r.error.flatten());
  return r.data;
}
const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => { fn(req, res, next).catch(next); };

export const router = Router();

router.get('/denials',
  requireAuth, requireRole('denial_appeals_specialist','billing_manager','compliance_officer','platform_administrator'),
  ah(async (req, res) => {
    const input = parse(ListSchema, req.query);
    const rows = await repo.listDenials(req.auth!, input.status ?? ['received','reviewing','appealing'], input.limit ?? 100);
    res.json({ count: rows.length, denials: rows });
  }),
);

router.get('/denials/:id', requireAuth, ah(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const d = await repo.getDenial(req.auth!, id);
  await auditLog({
    resource: 'denial', resourceId: id, action: 'read',
    actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
  });
  res.json(d);
}));

// POST /denials/:id/draft-appeal — AI drafts; status moves to 'reviewing'
router.post('/denials/:id/draft-appeal',
  requireAuth, requireRole('denial_appeals_specialist','billing_manager','platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = parse(DraftAppealSchema, req.body);
    const denial = await repo.getDenial(req.auth!, id);

    let clinicalSummary = '';
    if (input.clinicalDocId) {
      try {
        const doc = await clinicalDocClient.get<{ extractedText: string }>(`/clinical-doc/${input.clinicalDocId}`);
        clinicalSummary = (doc.data.extractedText ?? '').slice(0, 5000);
      } catch (err) {
        logger.warn('clinical-doc fetch failed; AI will draft without clinical summary', {
          denialId: id, error: (err as Error).message,
        });
      }
    }

    const draft = await denialPredictor.post<{
      engine_version: string; appeal_subject: string; appeal_body: string;
      suggested_attachments: string[]; confidence: number;
    }>('/v1/draft-appeal', {
      claim_id: denial.claim_id,
      denial_code: denial.carc_code,
      denial_description: denial.carc_description,
      clinical_summary: clinicalSummary,
      payer_id: 'unknown',     // could be enriched by joining to claims-service
      patient_first_name: input.patientFirstName,
      patient_last_name: input.patientLastName,
      provider_name: input.providerName,
      service_codes: [],
      diagnosis_codes: [],
    });

    const appeal = await repo.createAppealDraft(req.auth!, {
      denialId: id, draftedByAi: true,
      aiEngineVersion: draft.data.engine_version,
      aiConfidence: draft.data.confidence,
      subject: draft.data.appeal_subject,
      body: draft.data.appeal_body,
      attachments: draft.data.suggested_attachments,
    });

    await auditLog({
      resource: 'appeal', resourceId: appeal.id, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { drafted_by_ai: true, attempt: appeal.attempt_number },
    });
    res.status(201).json(appeal);
  }),
);

router.post('/appeals/:id/review',
  requireAuth, requireRole('denial_appeals_specialist','platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = parse(ReviewSchema, req.body);
    const updated = await repo.reviewAppeal(req.auth!, id, input);
    await auditLog({
      resource: 'appeal', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { fields_edited: Object.keys(input) },
    });
    res.json(updated);
  }),
);

router.post('/appeals/:id/submit',
  requireAuth, requireRole('denial_appeals_specialist','platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const appeal = await repo.submitAppeal(req.auth!, id);
    await emitEvent('claim.appealed', { appealId: id, denialId: appeal.denial_id },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    await auditLog({
      resource: 'appeal', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { action: 'submit' },
    });
    res.json(appeal);
  }),
);

router.post('/appeals/:id/outcome',
  requireAuth, requireRole('denial_appeals_specialist','platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = parse(OutcomeSchema, req.body);
    const appeal = await repo.recordAppealOutcome(req.auth!, id, input.status, input.notes);
    await auditLog({
      resource: 'appeal', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { outcome: input.status },
    });
    res.json(appeal);
  }),
);
