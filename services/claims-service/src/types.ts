export interface ClaimRow {
  id: string;
  ccn: string;
  encounter_id: string | null;
  provider_user_id: string;
  patient_id: string;
  payer_id: string;
  claim_type: string;
  state_code: string;
  service_date: Date;
  total_amount: number;
  status: string;
  fraud_score: number | null;
  fraud_flags: string[];
  edi_payload: string | null;
  submitted_at: Date | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface ClaimLineInput {
  line_number: number;
  procedure_code: string;
  modifier_codes?: string[];
  diagnosis_pointers?: number[];
  service_date: string; // ISO date
  units: number;
  unit_type?: string;
  charge_amount: number;
  place_of_service?: string;
}
