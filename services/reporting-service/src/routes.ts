import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth, requireRole, auditLog, ValidationError, logger,
} from '@medguard360/shared';
import * as repo from './repository';
import { buildPermReport, buildFraudSummary, buildClaimsVolume } from './reports';

const RunSchema = z.object({
  stateCode: z.string().length(2),
  kind: z.enum(['perm','fraud_summary','claims_volume']),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

const RollupQuerySchema = z.object({
  stateCode: z.string().length(2),
  metric: z.string().min(1),
  fromDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError('Invalid input', r.error.flatten());
  return r.data;
}
const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => { fn(req, res, next).catch(next); };

export const router = Router();

/**
 * GET /api/v1/reporting/reports
 * List the report kinds this service knows how to build. Used by the
 * /(dashboard)/reporting menu to render the available-reports list.
 *
 * Today the catalog is hardcoded — three kinds matching the RunSchema enum.
 * Future work: pull from a `report_definitions` table seeded per state.
 */
router.get('/reporting/reports',
  requireAuth,
  requireRole('state_medicaid_agency','mco_admin','compliance_officer','qa_auditor','platform_administrator','federal_cms'),
  (_req, res) => {
    res.json({
      reports: [
        {
          id: 'perm',
          name: 'PERM (Payment Error Rate Measurement)',
          description: 'Federal Medicaid sampling required by CMS — payment-error rate by state.',
          endpoint: '/api/v1/reporting/reports/run',
          parameters: { kind: 'perm' },
        },
        {
          id: 'fraud_summary',
          name: 'Fraud Case Summary',
          description: 'Cases opened, scores, AI-vs-human override rate. Sourced from fraud-engine-service.',
          endpoint: '/api/v1/reporting/reports/run',
          parameters: { kind: 'fraud_summary' },
        },
        {
          id: 'claims_volume',
          name: 'Claims Volume',
          description: 'Submitted / paid / denied / fraud-routed claim counts by state and time window.',
          endpoint: '/api/v1/reporting/reports/run',
          parameters: { kind: 'claims_volume' },
        },
      ],
    });
  },
);

// POST /reporting/reports/run — synchronous for now; spin off to a queue for heavy reports
router.post('/reporting/reports/run',
  requireAuth, requireRole('state_medicaid_agency','mco_admin','compliance_officer','qa_auditor','platform_administrator','federal_cms'),
  ah(async (req, res) => {
    const input = parse(RunSchema, req.body);
    const job = await repo.createJob(req.auth!, input.stateCode, input.kind, {
      from: input.from, to: input.to,
    });

    const from = new Date(input.from);
    const to   = new Date(input.to);
    try {
      let result;
      if (input.kind === 'perm')           result = await buildPermReport(req.auth!, input.stateCode, from, to);
      else if (input.kind === 'fraud_summary') result = await buildFraudSummary(req.auth!, input.stateCode, from, to);
      else                                  result = await buildClaimsVolume(req.auth!, input.stateCode, from, to);

      await repo.completeJob(job.id, result.data, result.rowsCount);
      await auditLog({
        resource: 'report_job', resourceId: job.id, action: 'create',
        actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
        context: { kind: input.kind, from: input.from, to: input.to, rows: result.rowsCount },
      });
      res.json({ jobId: job.id, kind: input.kind, ...result });
    } catch (err) {
      const msg = (err as Error).message;
      await repo.failJob(job.id, msg);
      logger.error('report failed', { jobId: job.id, error: msg });
      throw err;
    }
  }),
);

router.get('/reporting/reports/:id', requireAuth, ah(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const job = await repo.getJob(req.auth!, id);
  res.json(job);
}));

// Dashboard endpoint — quick rollup queries for portals
router.get('/reporting/reports/rollups',
  requireAuth, requireRole('state_medicaid_agency','mco_admin','compliance_officer','platform_administrator','federal_cms'),
  ah(async (req, res) => {
    const input = parse(RollupQuerySchema, req.query);
    const rows = await repo.getRollups(req.auth!, input.stateCode, input.metric, input.fromDay, input.toDay);
    res.json({ count: rows.length, rollups: rows });
  }),
);
