export type AlertSource = 'clinical_note' | 'hub_chat' | 'sms' | 'self_reported' | 'responder' | 'other';
export type AlertSeverity = 'low' | 'moderate' | 'high' | 'critical';
export type AlertStatus = 'active' | 'responder_dispatched' | 'resolved' | 'false_alarm';

export interface CrisisPlanRow {
  id: string;
  patient_id: string;
  state_code: string;
  created_by_provider_id: string;
  warning_signs: string[];
  internal_coping_strategies: string[];
  social_supports: unknown[];
  professional_supports: unknown[];
  emergency_contacts: unknown[];
  safe_environment_steps: string[];
  reasons_for_living: string | null;
  status: 'active' | 'retired';
  effective_from: string;
}

export interface AlertRow {
  id: string;
  patient_id: string | null;
  state_code: string;
  source: AlertSource;
  severity: AlertSeverity;
  signals: unknown;
  detected_at: Date;
  notified_911: boolean;
  status: AlertStatus;
}
