import { DomainEvent } from '@medguard360/shared';

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

export interface NormalizedAuditInsert {
  occurredAt: Maybe<string>;
  actorUserId: string | null;
  actorRole: string | null;
  actorState: string | null;
  actorOrg: string | null;
  sessionId: string | null;
  resource: string;
  resourceId: string;
  action: string;
  outcome: string;
  correlationId: string | null;
  context: Record<string, unknown>;
  producer: string;
}

export function normalizeAuditEvent(event: DomainEvent): NormalizedAuditInsert {
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

  const occurredAt: Maybe<string> = typeof event.occurredAt === 'string' ? event.occurredAt : null;

  return {
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
    correlationId,
    context,
    producer: event.producer ?? 'unknown',
  };
}