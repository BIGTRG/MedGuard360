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
import { normalizeAuditEvent } from './normalize';

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
  const n = normalizeAuditEvent(event);

  const result = await query<AuditLogEventRow>(
    'auditLog.insert',
    `INSERT INTO audit_log_events
       (occurred_at, actor_user_id, actor_role, actor_state_code, actor_org_id, session_id,
        resource, resource_id, action, outcome, context, correlation_id, producer)
     VALUES (COALESCE($1::timestamptz, NOW()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13)
     RETURNING *`,
    [
      n.occurredAt,
      n.actorUserId,
      n.actorRole,
      n.actorState,
      n.actorOrg,
      n.sessionId,
      n.resource,
      n.resourceId,
      n.action,
      n.outcome,
      JSON.stringify(n.context),
      n.correlationId,
      n.producer,
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
