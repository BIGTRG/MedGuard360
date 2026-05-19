/**
 * Audit-log client.
 *
 * Per CLAUDE.md and HIPAA 45 CFR Part 164:
 *  - EVERY PHI access (read, write, export, print) MUST be audit-logged.
 *  - Logs are append-only. audit-log-service writes to a Postgres table with
 *    triggers preventing UPDATE/DELETE and ships to ELK + cold archive.
 *  - We emit to Kafka topic `audit.event` so writes are async and never block
 *    the calling service's hot path.
 */

import { emitEvent } from '../kafka/client';
import { phiAccessTotal } from '../metrics';
import { AuthClaims } from '../types';

export type AuditAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'print'
  | 'login'
  | 'logout'
  | 'permission_change'
  | 'override';

export interface AuditEvent {
  /** What was accessed: 'patient', 'claim', 'credential', 'pa_request', etc. */
  resource: string;
  /** UUID of the specific record. Use 'multiple' for bulk queries. */
  resourceId: string;
  /** What the actor did. */
  action: AuditAction;
  /** Who did it. */
  actor: Pick<AuthClaims, 'sub' | 'role' | 'email' | 'sessionId' | 'orgId' | 'stateCode'>;
  /** Optional context: IP, user-agent, justification, before/after diff hash. */
  context?: Record<string, unknown>;
  /** Whether the action succeeded. Failed access attempts MUST still be logged. */
  outcome: 'success' | 'denied' | 'error';
  /** Ties together events from one request/workflow. */
  correlationId?: string;
}

/**
 * Record an audit event. Returns immediately — actual write is async.
 * Failure to emit does NOT block the caller (we don't want audit downtime
 * to block patient care), but is logged as a critical error to Prometheus.
 */
export async function auditLog(event: AuditEvent): Promise<void> {
  phiAccessTotal.inc({
    resource: event.resource,
    role: event.actor.role,
    action: event.action,
  });

  try {
    await emitEvent('audit.event', event, {
      actorUserId: event.actor.sub,
      correlationId: event.correlationId,
    });
  } catch (err) {
    // Last-resort: write to stderr so it ends up in stdout logs / ELK.
    // audit-log-service has a separate "missing audit" alert that fires
    // if PHI access metrics increase but audit topic shows no events.
    // eslint-disable-next-line no-console
    console.error('CRITICAL: audit log emit failed', { event, error: (err as Error).message });
  }
}
