/**
 * Frontend mirror of @medguard360/shared types so we don't have to import
 * server-only TypeScript packages into the portal bundle.
 */

export type UserRole =
  | 'patient'
  | 'individual_provider'
  | 'facility_provider'
  | 'pharmacy'
  | 'dmepos_supplier'
  | 'nemt_broker'
  | 'mco_admin'
  | 'state_medicaid_agency'
  | 'federal_cms'
  | 'credentialing_specialist'
  | 'prior_auth_specialist'
  | 'billing_manager'
  | 'compliance_officer'
  | 'fraud_investigator'
  | 'denial_appeals_specialist'
  | 'school_administrator'
  | 'hie_administrator'
  | 'emergency_responder'
  | 'qa_auditor'
  | 'platform_administrator';

export interface AuthClaims {
  sub: string;
  email: string;
  role: UserRole;
  stateCode?: string;
  orgId?: string;
  biometricVerified: boolean;
  sessionId: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  sessionId: string;
}

/** Subset of fraud_cases joined with fraud_scores for the investigator queue. */
export interface FraudCaseSummary {
  id: string;
  claim_id: string;
  state_code: string;
  status: 'open' | 'investigating' | 'confirmed_fraud' | 'cleared' | 'closed';
  opened_at: string;
  assigned_investigator: string | null;
  score: number;
  recommendation: 'auto_pay' | 'route_to_review' | 'auto_block';
  explanation: string;
}

export interface RollupRow {
  state_code: string;
  metric: string;
  day: string;
  value: string;
}

export interface PaRequestRow {
  id: string;
  patient_id: string;
  ordering_provider_id: string;
  payer_id: string;
  state_code: string;
  service_code: string;
  diagnosis_codes: string[];
  urgency: 'standard' | 'expedited' | 'drug';
  status: 'received' | 'evaluating' | 'approved' | 'denied' | 'needs_more_info' | 'withdrawn' | 'expired';
  decision_explanation: string | null;
  ai_engine_version: string | null;
  ai_match_score: string | null;
  due_at: string;
  decision_at?: string | null;
  decided_at?: string | null;
  updated_at?: string;
  created_at: string;
}

export interface CriterionEvalRow {
  id: string;
  pa_request_id: string;
  criterion_text: string;
  status: 'met' | 'not_met' | 'indeterminate';
  evidence_excerpt: string | null;
  ai_confidence: string;
}

// ── Shared entity types for dashboard pages ──────────────────────────────────

export interface Patient {
  id: string;
  medicaid_id: string;
  first_name: string;
  last_name: string;
  dob: string;
  state_code: string;
  payer_id: string | null;
  mco_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Claim {
  id: string;
  ccn: string;
  patient_id: string;
  payer_id: string;
  claim_type: string;
  state_code: string;
  service_date: string;
  total_amount: number;
  status: string;
  fraud_score: number | null;
  created_at: string;
}

export interface FraudCase {
  id: string;
  claim_id: string;
  risk_score: number | null;
  risk_level: string | null;
  status: string;
  ai_explanation: string | null;
  created_at: string;
}

export interface PaRequest {
  id: string;
  patient_id: string;
  procedure_code: string;
  status: string;
  urgency: string;
  ai_recommendation: string | null;
  ai_explanation: string | null;
  due_at: string;
  created_at: string;
}

export interface DashboardStats {
  totalClaims: number;
  fraudCasesOpen: number;
  paPending: number;
  credentialingPending: number;
  activePatients: number;
}

export interface CredentialingApplication {
  id: string;
  provider_id: string;
  state_code: string;
  application_type: 'initial' | 'recredential' | 'add_state' | 'add_mco';
  status: 'received' | 'docs_pending' | 'psv_pending' | 'review_pending' | 'approved' | 'denied' | 'withdrawn' | 'expired';
  submitted_at: string;
  target_decision_by: string;
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  endpoint: string;
}

export interface ReportResult {
  columns: string[];
  rows: Record<string, string | number | null>[];
  generated_at: string;
  row_count: number;
}
