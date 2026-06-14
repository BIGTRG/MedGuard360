export interface StateConfigRow {
  state_code: string;
  state_name: string;
  mmis_api_endpoint: string | null;
  mmis_credential_vault_key: string | null;
  timely_filing_days: number;
  expedited_pa_hours: number;
  standard_pa_days: number;
  drug_pa_hours: number;
  telehealth_audio_only_allowed: boolean;
  school_based_medicaid_enabled: boolean;
  fraud_score_auto_block_threshold: number;
  fraud_score_review_threshold: number;
  hub_phone_number: string | null;
  active: boolean;
  updated_at: Date;
  created_at: Date;
  updated_by: string | null;
  mac_part_a_b?: string | null;
  mac_dmepos?: string | null;
  hie_name?: string | null;
  hie_vendor?: string | null;
  expansion_status?: string | null;
  community_engagement_rules?: Record<string, unknown>;
}

export interface PaRuleRow {
  id: string;
  state_code: string;
  payer_id: string;
  service_code: string;
  service_code_type: string;
  pa_required: boolean;
  expedited_eligible: boolean;
  criteria_document_id: string | null;
}
