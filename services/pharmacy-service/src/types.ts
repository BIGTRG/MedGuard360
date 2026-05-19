export interface PharmacyClaim {
  id: string;
  patient_id: string;
  pharmacy_user_id: string;
  ndc_code: string;
  drug_name: string | null;
  quantity: number;
  days_supply: number;
  fill_date: string; // DATE as ISO string
  payer_id: string;
  state_code: string;
  total_amount: number;
  copay: number;
  prior_auth_number: string | null;
  status: PharmacyClaimStatus;
  ncpdp_payload: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type PharmacyClaimStatus =
  | 'submitted'
  | 'adjudicated'
  | 'paid'
  | 'rejected'
  | 'reversed';

export interface CreatePharmacyClaimInput {
  patient_id: string;
  pharmacy_user_id: string;
  ndc_code: string;
  drug_name?: string;
  quantity: number;
  days_supply: number;
  fill_date: string;
  payer_id: string;
  state_code: string;
  total_amount: number;
  copay?: number;
  prior_auth_number?: string;
  patient_medicaid_id: string;
  pharmacy_npi: string;
}

export interface PharmacyClaimFilters {
  patientId?: string;
  pharmacyId?: string;
  stateCode?: string;
  status?: PharmacyClaimStatus;
}

export interface FormularyCheckInput {
  ndcCode: string;
  payerId: string;
  stateCode: string;
}

export interface FormularyCheckResult {
  covered: boolean;
  requiresPA: boolean;
  tier: number;
}
