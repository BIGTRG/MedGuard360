/**
 * audit-log-service repository — append-only.
 *
 * The audit_log_events table has DB-level triggers blocking UPDATE/DELETE.
 * insertEvent must NEVER silently swallow errors — the consumer exits on failure.
 */

import { query, pool, DomainEvent } from '@medguard360/shared';
import { AuditLogEventRow } from './types';

// ── Insert ────────────────────────────────────────────────────────────────────

/**
 * Persist one DomainEvent as an audit log row.
 * Extracts well-known fields from event.payload; everything else goes into payload.
 */
export async function insertEvent(event: DomainEvent): Promise<AuditLogEventRow> {
  const p = (event.payload ?? {}) as Record<string, unknown>;

  const userId      = (p['userId']      ?? p['user_id']      ?? null) as string | null;
  const action      = (p['action']      ?? event.type        ?? 'unknown') as string;
  const resourceType= (p['resourceType']?? p['resource_type']?? event.aggregateType ?? 'unknown') as string;
  const resourceId  = (p['resourceId']  ?? p['resource_id']  ?? null) as string | null;
  const stateCode   = (p['stateCode']   ?? p['state_code']   ?? null) as string | null;
  const ipAddress   = (p['ipAddress']   ?? p['ip_address']   ?? null) as string | null;
  const deviceId    = (p['deviceId']    ?? p['device_id']    ?? null) as string | null;
  const phiAccessed = Boolean(p['phiAccessed'] ?? p['phi_accessed'] ?? false);
  const eventType   = event.type;

  const result = await query<AuditLogEventRow>(
    'auditLog.insert',
    `INSERT INTO audit_log_events
       (user_id, action, resource_type, resource_id, state_code,
        ip_address, device_id, phi_accessed, event_type, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      userId,
      action,
      resourceType,
      resourceId,
      stateCode,
      ipAddress,
      deviceId,
      phiAccessed,
      eventType,
      JSON.stringify(p),
    ],
  );
  return result.rows[0];
}

// ── Query ─────────────────────────────────────────────────────────────────────

export interface QueryEventsFilters {
  userId?:          string;
  resourceType?:    string;
  stateCode?:       string;
  startDate?:       Date;
  endDate?:         Date;
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

  if (filters.userId)          push('user_id = $$',       filters.userId);
  if (filters.resourceType)    push('resource_type = $$', filters.resourceType);
  if (filters.stateCode)       push('state_code = $$',    filters.stateCode);
  if (filters.startDate)       push('created_at >= $$',   filters.startDate);
  if (filters.endDate)         push('created_at <= $$',   filters.endDate);
  if (filters.phiAccessedOnly) push('phi_accessed = $$',  true);

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const limit  = Math.min(filters.limit  ?? 100, 1000);
  const offset = filters.offset ?? 0;

  // Run count and data query in parallel on a single pooled connection each.
  const client = await pool.connect();
  try {
    const [countResult, dataResult] = await Promise.all([
      client.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM audit_log_events ${whereClause}`,
        params,
      ),
      client.query<AuditLogEventRow>(
        `SELECT * FROM audit_log_events ${whereClause}
           ORDER BY created_at DESC
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
