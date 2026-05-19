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
  created_at: Date;
  updated_at: Date;
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
