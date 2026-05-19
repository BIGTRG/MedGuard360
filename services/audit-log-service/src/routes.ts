/**
 * audit-log-service read API — /api/v1/audit-log
 *
 * Only compliance officers, platform administrators, and fraud investigators
 * may query audit logs. RLS enforces state-level scoping at the DB layer.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, ValidationError, NotFoundError } from '@medguard360/shared';
import * as repo from './repository';

// ── Zod schemas ───────────────────────────────────────────────────────────────

const QuerySchema = z.object({
  userId:          z.string().uuid().optional(),
  resourceType:    z.string().min(1).optional(),
  stateCode:       z.string().length(2).optional(),
  startDate:       z.string().datetime().optional(),
  endDate:         z.string().datetime().optional(),
  phiOnly:         z.enum(['true', 'false']).optional(),
  limit:           z.coerce.number().int().min(1).max(1000).optional(),
  offset:          z.coerce.number().int().min(0).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

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
] as const;

// ── Router ────────────────────────────────────────────────────────────────────

export const router = Router();

/**
 * GET /api/v1/audit-log
 * Query audit events with optional filters.
 */
router.get(
  '/audit-log',
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  ah(async (req, res) => {
    const q = parse(QuerySchema, req.query);

    const result = await repo.queryEvents({
      userId:          q.userId,
      resourceType:    q.resourceType,
      stateCode:       q.stateCode,
      startDate:       q.startDate  ? new Date(q.startDate)  : undefined,
      endDate:         q.endDate    ? new Date(q.endDate)    : undefined,
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
  }),
);

/**
 * GET /api/v1/audit-log/:id
 * Retrieve a single audit event by its UUID.
 */
router.get(
  '/audit-log/:id',
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  ah(async (req, res) => {
    const id = z.string().uuid('Invalid audit log event ID').parse(req.params['id']);
    const row = await repo.getEventById(id);
    if (!row) throw new NotFoundError(`Audit log event ${id}`);
    res.json(row);
  }),
);
