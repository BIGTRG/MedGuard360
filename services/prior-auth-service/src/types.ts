export interface PaRequestRow {
  id: string;
  patient_id: string;
  provider_user_id: string;
  state_code: string;
  payer_id: string;
  procedure_code: string;
  diagnosis_codes: string[];
  clinical_justification: string | null;
  urgency: 'standard' | 'expedited' | 'drug';
  status: 'pending' | 'approved' | 'denied' | 'needs_more_info' | 'expired';
  ai_recommendation: string | null;
  ai_confidence: number | null;
  ai_explanation: string | null;
  human_reviewer_id: string | null;
  human_decision: string | null;
  human_notes: string | null;
  due_at: Date;
  decided_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface CriterionEvaluationRow {
  id: string;
  pa_request_id: string;
  criterion_text: string;
  similarity_score: number | null;
  outcome: 'met' | 'not_met' | 'indeterminate';
  explanation: string | null;
  human_outcome: 'met' | 'not_met' | 'indeterminate' | null;
  human_outcome_at: Date | string | null;
  human_reviewer_id: string | null;
  created_at: Date;
}

export interface PaRuleResponse {
  requires_pa: boolean;
  pa_type: 'standard' | 'expedited' | 'drug';
  criteria_summary: string | null;
}
