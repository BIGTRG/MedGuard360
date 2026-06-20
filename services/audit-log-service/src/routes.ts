/**
 * audit-log-service read API.
 *
 *   GET /api/v1/audit/search   — query events with optional filters
 *   GET /api/v1/audit/:id      — retrieve a single event by id
 *
 * Only compliance officers, platform administrators, and fraud investigators
 * may query audit logs. RLS enforces state-level scoping at the DB layer.
 *
 * Path convention: matches the nginx route `/api/v1/audit/*` (defined in
 * infrastructure/docker/nginx.dev.conf) and the frontend's existing
 * `/v1/audit/search` callsite in src/app/audit/page.tsx. Handlers were
 * historically at `/audit-log/...` which didn't reach the service via
 * nginx — corrected 2026-05-23.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, ValidationError, NotFoundError } from '@medguard360/shared';
import * as repo from './repository';
import { QuerySchema } from './validation';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError('Invalid query parameters', result.error.flatten());
  return result.data;
}

const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

const ALLOWED_ROLES = [
  'compliance_officer',
  'platform_administrator',
  'fraud_investigator',
  'qa_auditor',
] as const;

// ── Router ───────────────────────────────────────────────────────────────────

export const router = Router();

async function searchAuditEvents(req: Request, res: Response): Promise<void> {
  const q = parse(QuerySchema, req.query);

  const startStr = q.startDate ?? q.from;
  const endStr   = q.endDate   ?? q.to;
  const result = await repo.queryEvents({
    actorUserId:     q.actorUserId ?? q.userId,
    resource:        q.resource ?? q.resourceType,
    resourceId:      q.resourceId,
    correlationId:   q.correlationId,
    stateCode:       q.stateCode,
    startDate:       startStr ? new Date(startStr) : undefined,
    endDate:         endStr   ? new Date(endStr)   : undefined,
    phiAccessedOnly: q.phiOnly === 'true',
    limit:           q.limit,
    offset:          q.offset,
  });

  res.json({
    total:  result.total,
    count:  result.rows.length,
    offset: q.offset ?? 0,
    rows:   result.rows,
  });
}

/**
 * GET /api/v1/audit/search
 * Query audit events with optional filters. Frontend's /audit page calls this.
 *
 * Mounted before `/audit/:id` so the literal "search" doesn't get matched
 * as a uuid.
 */
router.get(
  '/audit/search',
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  ah(async (req, res) => searchAuditEvents(req, res)),
);

/** Legacy alias — some scripts used /audit/events before search was canonical. */
router.get(
  '/audit/events',
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  ah(async (req, res) => searchAuditEvents(req, res)),
);

/**
 * GET /api/v1/audit/:id
 * Retrieve a single audit event by its UUID.
 */
router.get(
  '/audit/:id',
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  ah(async (req, res) => {
    const id = z.string().uuid('Invalid audit event ID').parse(req.params['id']);
    const row = await repo.getEventById(id);
    if (!row) throw new NotFoundError(`Audit event ${id}`);
    res.json(row);
  }),
);

