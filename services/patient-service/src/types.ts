export interface PatientRow {
  id: string;
  medicaid_id: string;
  medicare_id: string | null;
  first_name: string;
  last_name: string;
  dob: Date;
  state_code: string;
  payer_id: string | null;
  mco_id: string | null;
  biometric_hash: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface CrisisPlanRow {
  id: string;
  patient_id: string;
  triggers: string[];
  deescalation_strategies: string[];
  emergency_contacts: unknown[];
  preferred_hospital: string | null;
  medications: unknown[];
  allergies: string[];
  dnr_status: boolean;
  created_by: string;
  updated_at: Date;
  created_at: Date;
}
