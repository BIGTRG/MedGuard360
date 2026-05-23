/**
 * audit-log-service repository — append-only.
 *
 * The audit_log_events table has DB-level triggers blocking UPDATE/DELETE.
 * insertEvent must NEVER silently swallow errors — the consumer exits on
 * failure (PM2 restarts), so losing an audit event surfaces as a process
 * crash rather than a silent compliance gap.
 *
 * Schema source-of-truth: infrastructure/postgres/migrations/0001_base_schema.sql.
 * Columns: id, occurred_at, actor_user_id, actor_role, actor_state_code,
 *          actor_org_id, session_id, resource, resource_id, action, outcome,
 *          context, correlation_id, producer.
 */

import { query, pool, DomainEvent } from '@medguard360/shared';
import { AuditLogEventRow } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

type Maybe<T> = T | null | undefined;

function pickString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

function pickRecord(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object' && !Array.isArray(v))
    ? v as Record<string, unknown>
    : {};
}

// ── Insert ───────────────────────────────────────────────────────────────────

/**
 * Persist one `audit.event` DomainEvent as an audit_log_events row.
 *
 * Tolerates two payload shapes:
 *   - Canonical (from packages/shared/audit/client.ts):
 *       payload.actor = { sub, role, stateCode, orgId, sessionId }
 *       payload.{resource, resourceId, action, outcome, context, correlationId}
 *   - Flat (legacy / direct emitters):
 *       payload.{userId, resource_type/resourceType, resource_id/resourceId, ...}
 *
 * Unknown fields are preserved in the context jsonb so nothing is lost.
 */
export async function insertEvent(event: DomainEvent): Promise<AuditLogEventRow> {
  const p = (event.payload ?? {}) as Record<string, unknown>;
  const actor = pickRecord(p['actor']);

  const actorUserId   = pickString(actor['sub'],        p['actorUserId'], p['userId'],        p['user_id'],        event.actorUserId);
  const actorRole     = pickString(actor['role'],       p['actorRole'],   p['role']);
  const actorState    = pickString(actor['stateCode'],  p['stateCode'],   p['state_code']);
  const actorOrg      = pickString(actor['orgId'],      p['orgId'],       p['org_id']);
  const sessionId     = pickString(actor['sessionId'],  p['sessionId'],   p['session_id']);

  const resource      = pickString(p['resource'],       p['resourceType'], p['resource_type'], event.eventType.split('.')[0]) ?? 'unknown';
  const resourceId    = pickString(p['resourceId'],     p['resource_id']) ?? 'unknown';
  const action        = pickString(p['action'],         event.eventType) ?? 'unknown';
  const outcome       = pickString(p['outcome'])        ?? 'success';
  const correlationId = pickString(p['correlationId'],  p['correlation_id'], event.correlationId);

  // Preserve any caller-supplied context AND any flat-shape leftovers so the
  // jsonb column captures everything we didn't promote to a column.
  const knownTopLevel = new Set([
    'actor', 'resource', 'resourceId', 'resource_id', 'resourceType', 'resource_type',
    'action', 'outcome', 'context', 'correlationId', 'correlation_id',
    'userId', 'user_id', 'actorUserId', 'actorRole', 'role', 'stateCode', 'state_code',
    'orgId', 'org_id', 'sessionId', 'session_id',
  ]);
  const leftovers: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (!knownTopLevel.has(k)) leftovers[k] = v;
  }
  const context: Record<string, unknown> = {
    ...pickRecord(p['context']),
    ...leftovers,
  };

  // Use the event's emitted timestamp if present, else the DB default (now()).
  const occurredAt: Maybe<string> = typeof event.occurredAt === 'string' ? event.occurredAt : null;

  const result = await query<AuditLogEventRow>(
    'auditLog.insert',
    `INSERT INTO audit_log_events
       (occurred_at, actor_user_id, actor_role, actor_state_code, actor_org_id, session_id,
        resource, resource_id, action, outcome, context, correlation_id, producer)
     VALUES (COALESCE($1::timestamptz, NOW()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13)
     RETURNING *`,
    [
      occurredAt,
      actorUserId,
      actorRole,
      actorState,
      actorOrg,
      sessionId,
      resource,
      resourceId,
      action,
      outcome,
      JSON.stringify(context),
      correlationId,
      event.producer ?? 'unknown',
    ],
  );
  return result.rows[0];
}

// ── Query ────────────────────────────────────────────────────────────────────

export interface QueryEventsFilters {
  /** Actor user id (canonical name). Aliased from `userId` for back-compat. */
  actorUserId?:     string;
  /** Resource type, e.g. 'patient', 'claim'. Aliased from `resourceType`. */
  resource?:        string;
  /** Specific record uuid/string. */
  resourceId?:      string;
  /** Ties events caused by the same request together. */
  correlationId?:   string;
  /** Two-letter state filter for non-cross-state roles. */
  stateCode?:       string;
  startDate?:       Date;
  endDate?:         Date;
  /** Filter to events where context.phiAccessed === true. */
  phiAccessedOnly?: boolean;
  limit?:           number;
  offset?:          number;
}

export interface QueryEventsResult {
  rows:  AuditLogEventRow[];
  total: number;
}

export async function queryEvents(filters: QueryEventsFilters): Promise<QueryEventsResult> {
  const where: string[] = [];
  const params: unknown[] = [];

  const push = (clause: string, val: unknown): void => {
    params.push(val);
    where.push(clause.replace('$$', `$${params.length}`));
  };

  if (filters.actorUserId)     push('actor_user_id = $$',    filters.actorUserId);
  if (filters.resource)        push('resource = $$',         filters.resource);
  if (filters.resourceId)      push('resource_id = $$',      filters.resourceId);
  if (filters.correlationId)   push('correlation_id = $$',   filters.correlationId);
  if (filters.stateCode)       push('actor_state_code = $$', filters.stateCode);
  if (filters.startDate)       push('occurred_at >= $$',     filters.startDate);
  if (filters.endDate)         push('occurred_at <= $$',     filters.endDate);
  if (filters.phiAccessedOnly) {
    // Parameter-free clause — append directly, don't disturb params numbering
    where.push(`(context->>'phiAccessed' = 'true' OR context->>'phi_accessed' = 'true')`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const limit  = Math.min(filters.limit  ?? 100, 1000);
  const offset = filters.offset ?? 0;

  const client = await pool.connect();
  try {
    const [countResult, dataResult] = await Promise.all([
      client.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM audit_log_events ${whereClause}`,
        params,
      ),
      client.query<AuditLogEventRow>(
        `SELECT * FROM audit_log_events ${whereClause}
           ORDER BY occurred_at DESC
           LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ]);

    return {
      rows:  dataResult.rows,
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    };
  } finally {
    client.release();
  }
}

export async function getEventById(id: string): Promise<AuditLogEventRow | null> {
  const result = await query<AuditLogEventRow>(
    'auditLog.getById',
    'SELECT * FROM audit_log_events WHERE id = $1 LIMIT 1',
    [id],
  );
  return result.rows[0] ?? null;
}
