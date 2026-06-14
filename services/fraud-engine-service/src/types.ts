export interface FraudCase {
  id: string;
  claim_id: string;
  provider_user_id: string;
  patient_id: string;
  state_code: string;
  risk_score: number | null;
  risk_level: string | null;
  flags: string[];
  recommendation: string | null;
  ai_explanation: string | null;
  status: string; // open | under_review | cleared | confirmed_fraud
  assigned_to: string | null;
  ai_engine_unavailable: boolean;
  resolved_at: Date | null;
  resolution_notes: string | null;
  escalated_at: Date | null;
  escalated_by: string | null;
  escalation_target: 'OCPI' | 'MFCU' | 'CMS_UPIC' | 'STATE_OIG' | null;
  escalation_notes: string | null;
  opened_at: Date;
  created_at: Date;
  updated_at: Date;
}

/** Shape expected by frontend/portals investigator queue. */
export interface FraudCasePortalView {
  id: string;
  claim_id: string;
  state_code: string;
  status: string;
  opened_at: string;
  assigned_investigator: string | null;
  score: number;
  recommendation: 'auto_pay' | 'route_to_review' | 'auto_block';
  explanation: string;
}

export interface ClaimFeatureVector {
  claim_id: string;
  provider_id: string;
  patient_id: string;
  state_code: string;
  service_date: string;
  total_amount: number;
  procedure_codes: string[];
  diagnosis_codes: string[];
  payer_id: string;
  submission_hour: number;
  provider_monthly_claims: number;
  patient_monthly_claims: number;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 80) return 'high';
  return 'critical';
}

export interface FraudScoreRow {
  id: string;
  claim_id: string;
  state_code: string;
  score: number;
  recommendation: string;
  flags: { code: string; label: string; severity: number }[];
  explanation: string;
  engine_version: string;
  created_at: Date;
}

export interface StateThresholds {
  auto_pay_below: number;
  auto_block_above: number;
}
