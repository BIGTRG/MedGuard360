export interface AuditLogEventRow {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  state_code: string | null;
  ip_address: string | null;
  device_id: string | null;
  phi_accessed: boolean;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: Date;
}
