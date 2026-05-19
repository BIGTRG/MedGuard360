export interface StateConfigRow {
  id: string;
  state_code: string;
  state_name: string;
  mmis_endpoint: string | null;
  mmis_credentials_vault_key: string | null;
  telehealth_rules: Record<string, unknown>;
  pa_rules: Record<string, unknown>;
  timely_filing_days: number;
  fraud_thresholds: { auto_pay_below: number; auto_block_above: number };
  is_active: boolean;
  updated_at: Date;
  created_at: Date;
}

export interface PaRuleRow {
  id: string;
  state_code: string;
  payer_id: string;
  procedure_code: string;
  requires_pa: boolean;
  pa_type: string;
  criteria_summary: string | null;
}
