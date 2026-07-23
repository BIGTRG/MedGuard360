export type CheckSource =
  | 'mmis_270_271'
  | 'nctracks_270_271'
  | 'cache'
  | 'ai_prediction'
  | 'manual';

export interface EligibilityRow {
  id: string;
  patient_id: string;
  state_code: string;
  payer_id: string;
  coverage_type: string;
  source: CheckSource;
  active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  plan_name: string | null;
  copay_cents: number | null;
  deductible_remaining_cents: number | null;
  details: Record<string, unknown>;
  checked_at: Date;
  ttl_until: Date;
}
