/**
 * credentialing-service routes.
 *
 *   POST /credentialing/applications                    — submit new
 *   GET  /credentialing/applications/:id                — read full state
 *   POST /credentialing/applications/:id/documents      — upload doc (calls ocr-engine)
 *   POST /credentialing/applications/:id/run-psv        — run all PSV checks
 *   POST /credentialing/applications/:id/decide         — credentialing specialist approves/denies
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import axios from 'axios';
import { z } from 'zod';
import {
  requireAuth, requireRole, auditLog, emitEvent, ValidationError,
  logger, config, UpstreamError,
} from '@medguard360/shared';
import * as repo from './repository';
import * as storage from './storage';
import { runAllPsv, summarizePsv } from './psv';

const ocrClient = axios.create({
  baseURL: 'http://localhost:8003',
  timeout: 60_000,
  headers: { 'x-service-caller': config.serviceName },
});
ocrClient.interceptors.response.use(r => r, err => Promise.reject(new UpstreamError('ocr-engine', err.message)));

const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } });

const CreateAppSchema = z.object({
  providerId: z.string().uuid(),
  stateCode: z.string().length(2),
  mcoId: z.string().uuid().optional(),
  applicationType: z.enum(['initial','recredential','add_state','add_mco']),
});

const PsvSchema = z.object({
  npi: z.string().regex(/^\d{10}$/),
  deaNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().length(2).optional(),
});

const DecideSchema = z.object({
  status: z.enum(['approved','denied']),
  reason: z.string().min(10).max(2000),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError('Invalid input', r.error.flatten());
  return r.data;
}
const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => { fn(req, res, next).catch(next); };

export const router = Router();

router.post('/credentialing/applications',
  requireAuth, requireRole('credentialing_specialist','individual_provider','facility_provider','platform_administrator'),
  ah(async (req, res) => {
    const input = parse(CreateAppSchema, req.body);
    const app = await repo.createApplication(req.auth!, input);
    await emitEvent('credentialing.application.received', {
      applicationId: app.id, providerId: app.provider_id, stateCode: app.state_code,
      type: app.application_type, targetDecisionBy: app.target_decision_by,
    }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    await auditLog({
      resource: 'credentialing_application', resourceId: app.id, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
    });
    res.status(201).json(app);
  }),
);

// GET /credentialing/applications — list with filters (used by credentialing portal page)
router.get('/credentialing/applications', requireAuth, ah(async (req, res) => {
  const ListSchema = z.object({
    status: z.union([
      z.enum(['received','docs_pending','psv_pending','review_pending','approved','denied','withdrawn','expired']),
      z.array(z.enum(['received','docs_pending','psv_pending','review_pending','approved','denied','withdrawn','expired'])),
    ]).optional(),
    stateCode: z.string().length(2).optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
  });
  const parsed = ListSchema.safeParse(req.query);
  if (!parsed.success) throw new ValidationError('Invalid query', parsed.error.flatten());
  const rows = await repo.listApplications(req.auth!, parsed.data);
  res.json({ count: rows.length, applications: rows });
}));

router.get('/credentialing/applications/:id', requireAuth, ah(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const app = await repo.getApplication(req.auth!, id);
  await auditLog({
    resource: 'credentialing_application', resourceId: id, action: 'read',
    actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
  });
  res.json(app);
}));

router.post('/credentialing/applications/:id/documents',
  requireAuth, requireRole('credentialing_specialist','individual_provider','facility_provider','platform_administrator'),
  upload.single('document'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) throw new ValidationError('document file required');

    const up = await storage.upload(id, file.originalname || 'doc', file.mimetype, file.buffer);
    const doc = await repo.insertDocument(req.auth!, {
      applicationId: id, docType: 'unclassified', mimeType: file.mimetype,
      bucket: up.bucket, objectKey: up.objectKey, sizeBytes: up.sizeBytes, sha256: up.sha256,
    });

    // OCR + classify
    const docUrl = await storage.presignedUrl(up.bucket, up.objectKey, 600);
    try {
      const ocr = await ocrClient.post<{
        text: string; classified_as: string; classification_confidence: number;
        extracted_fields: unknown; engine_version: string;
      }>('/v1/ocr', { document_url: docUrl, correlation_id: id });

      await repo.attachOcrResults(req.auth!, doc.id, {
        text: ocr.data.text,
        classifiedAs: ocr.data.classified_as,
        classificationConfidence: ocr.data.classification_confidence,
        extractedFields: ocr.data.extracted_fields,
        engineVersion: ocr.data.engine_version,
      });
    } catch (err) {
      logger.warn('ocr failed; document stored without extraction', {
        docId: doc.id, error: (err as Error).message,
      });
    }

    await auditLog({
      resource: 'credentialing_document', resourceId: doc.id, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
    });

    res.status(201).json(doc);
  }),
);

router.post('/credentialing/applications/:id/run-psv',
  requireAuth, requireRole('credentialing_specialist','platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = parse(PsvSchema, req.body);
    const app = await repo.getApplication(req.auth!, id);
    await repo.setStatus(req.auth!, id, 'psv_pending');

    const results = await runAllPsv({
      providerId: app.provider_id,
      npi: input.npi,
      stateCode: app.state_code,
      deaNumber: input.deaNumber,
      licenseNumber: input.licenseNumber,
      licenseState: input.licenseState,
    });

    const stored: unknown[] = [];
    for (const r of results) {
      const row = await repo.insertPsvResult(req.auth!, {
        applicationId: id,
        source: r.source, status: r.status, resultSummary: r.resultSummary,
        sourceReference: r.sourceReference, rawResponse: r.rawResponse, expiresAt: r.expiresAt,
      });
      stored.push(row);
    }

    const summary = summarizePsv(results);
    await emitEvent('credentialing.psv.completed', {
      applicationId: id, providerId: app.provider_id,
      flagged: summary.flagged, allClear: summary.allClear, summary: summary.summary,
    }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });

    if (summary.allClear) await repo.setStatus(req.auth!, id, 'review_pending');
    else                 await repo.setStatus(req.auth!, id, 'docs_pending', summary.summary);

    await auditLog({
      resource: 'credentialing_application', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { action: 'run_psv', flagged: summary.flagged, allClear: summary.allClear },
    });

    res.json({ summary, results: stored });
  }),
);

router.post('/credentialing/applications/:id/decide',
  requireAuth, requireRole('credentialing_specialist','platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = parse(DecideSchema, req.body);
    const app = await repo.getApplication(req.auth!, id);
    const updated = await repo.setStatus(req.auth!, id, input.status, input.reason);

    if (input.status === 'approved') {
      const today = new Date().toISOString().slice(0, 10);
      const oneYear = new Date(); oneYear.setFullYear(oneYear.getFullYear() + 1);
      await repo.issueCredential(req.auth!, {
        providerId: app.provider_id,
        stateCode: app.state_code,
        mcoId: app.mco_id ?? undefined,
        applicationId: id,
        effectiveFrom: input.effectiveFrom ?? today,
        expiresAt: input.expiresAt ?? oneYear.toISOString().slice(0, 10),
      });
      await emitEvent('credentialing.approved', { applicationId: id, providerId: app.provider_id, stateCode: app.state_code },
        { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    } else {
      await emitEvent('credentialing.denied', { applicationId: id, providerId: app.provider_id, reason: input.reason },
        { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    }

    await auditLog({
      resource: 'credentialing_application', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { decision: input.status },
    });
    res.json(updated);
  }),
);
