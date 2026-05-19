BEGIN;
CREATE TABLE pharmacy_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  pharmacy_user_id UUID NOT NULL REFERENCES users(id),
  ndc_code TEXT NOT NULL,
  drug_name TEXT,
  quantity NUMERIC(10,3) NOT NULL,
  days_supply INTEGER NOT NULL,
  fill_date DATE NOT NULL,
  payer_id TEXT NOT NULL,
  state_code CHAR(2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  copay NUMERIC(12,2) DEFAULT 0,
  prior_auth_number TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  ncpdp_payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id)
);
COMMIT;
