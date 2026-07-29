-- NCTracks submission tracking + X12 audit (NC Medicaid MMIS integration).
-- Retain nctracks_x12_audit payloads per HIPAA (target 10-year retention via ops/archival policy).

CREATE TABLE IF NOT EXISTS nctracks_submissions (
  id                            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id                      uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  patient_control_number        varchar(40) NOT NULL,
  interchange_control_number    varchar(9) NOT NULL,
  group_control_number          varchar(9) NOT NULL,
  transaction_set_control_number varchar(9) NOT NULL,
  file_name                     text NOT NULL,
  adapter_mode                  text NOT NULL,
  submitted_at                  timestamptz NOT NULL,
  ack999_accepted               boolean,
  ack999_raw                    text,
  ack277ca_status               text,
  ack277ca_raw                  text,
  ack_polled_at                 timestamptz,
  payer_claim_control_number    varchar(40),
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nctracks_submissions_claim_idx
  ON nctracks_submissions(claim_id);
CREATE INDEX IF NOT EXISTS nctracks_submissions_icn_idx
  ON nctracks_submissions(interchange_control_number);
CREATE INDEX IF NOT EXISTS nctracks_submissions_pcn_idx
  ON nctracks_submissions(patient_control_number);
CREATE INDEX IF NOT EXISTS nctracks_submissions_pending_ack_idx
  ON nctracks_submissions(submitted_at)
  WHERE ack_polled_at IS NULL;

CREATE TABLE IF NOT EXISTS nctracks_x12_audit (
  id                         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id                   uuid REFERENCES claims(id) ON DELETE SET NULL,
  direction                  text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  transaction_type           text NOT NULL,
  patient_control_number     varchar(40),
  interchange_control_number varchar(9),
  file_name                  text,
  payload                    text NOT NULL,
  adapter_mode               text NOT NULL,
  recorded_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nctracks_x12_audit_recorded_idx
  ON nctracks_x12_audit(recorded_at DESC);
CREATE INDEX IF NOT EXISTS nctracks_x12_audit_pcn_idx
  ON nctracks_x12_audit(patient_control_number);

DROP TRIGGER IF EXISTS nctracks_submissions_set_updated_at ON nctracks_submissions;
CREATE TRIGGER nctracks_submissions_set_updated_at BEFORE UPDATE ON nctracks_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE nctracks_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nctracks_x12_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nctracks_submissions_read ON nctracks_submissions;
CREATE POLICY nctracks_submissions_read ON nctracks_submissions FOR SELECT USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('billing_manager', 'platform_administrator', 'compliance_officer', 'state_medicaid_agency')
);

DROP POLICY IF EXISTS nctracks_x12_audit_read ON nctracks_x12_audit;
CREATE POLICY nctracks_x12_audit_read ON nctracks_x12_audit FOR SELECT USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('platform_administrator', 'compliance_officer', 'state_medicaid_agency')
);