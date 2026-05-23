/**
 * Row shape returned from queries against `audit_log_events`.
 *
 * Columns mirror the canonical schema in
 * `infrastructure/postgres/migrations/0001_base_schema.sql`. Append-only:
 * the table has DB triggers blocking UPDATE/DELETE.
 */
export interface AuditLogEventRow {
  id:                string;
  occurred_at:       Date | string;
  actor_user_id:     string | null;
  actor_role:        string | null;
  actor_state_code:  string | null;
  actor_org_id:      string | null;
  session_id:        string | null;
  resource:          string;
  resource_id:       string;
  action:            string;
  outcome:           string;
  context:           Record<string, unknown>;
  correlation_id:    string | null;
  producer:          string;
}
