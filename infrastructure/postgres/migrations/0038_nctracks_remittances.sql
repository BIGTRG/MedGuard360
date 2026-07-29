-- NCTracks 835 remittance tracking (SFTP poll -> claim adjudication).

CREATE TABLE IF NOT EXISTS nctracks_remittance_files (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name           text NOT NULL UNIQUE,
  check_or_eft_number text,
  payment_date        date,
  payee_npi           varchar(20),
  total_paid          numeric(12, 2),
  raw835              text NOT NULL,
  adapter_mode        text NOT NULL,
  received_at         timestamptz NOT NULL DEFAULT now(),
  processed_at        timestamptz
);

CREATE TABLE IF NOT EXISTS nctracks_remittance_claims (
  id                         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  remittance_file_id         uuid NOT NULL REFERENCES nctracks_remittance_files(id) ON DELETE CASCADE,
  patient_control_number     varchar(40) NOT NULL,
  payer_claim_control_number varchar(40),
  charged_amount             numeric(12, 2),
  paid_amount                numeric(12, 2),
  claim_status_code          text,
  claim_id                   uuid REFERENCES claims(id) ON DELETE SET NULL,
  applied_at                 timestamptz,
  UNIQUE (remittance_file_id, patient_control_number)
);

CREATE INDEX IF NOT EXISTS nctracks_remittance_claims_pcn_idx
  ON nctracks_remittance_claims(patient_control_number);
CREATE INDEX IF NOT EXISTS nctracks_remittance_files_received_idx
  ON nctracks_remittance_files(received_at DESC);

ALTER TABLE nctracks_remittance_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE nctracks_remittance_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nctracks_remittance_files_read ON nctracks_remittance_files;
CREATE POLICY nctracks_remittance_files_read ON nctracks_remittance_files FOR SELECT USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('billing_manager', 'platform_administrator', 'compliance_officer', 'state_medicaid_agency')
);

DROP POLICY IF EXISTS nctracks_remittance_claims_read ON nctracks_remittance_claims;
CREATE POLICY nctracks_remittance_claims_read ON nctracks_remittance_claims FOR SELECT USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('billing_manager', 'platform_administrator', 'compliance_officer', 'state_medicaid_agency')
);