-- =====================================================================
-- claims-service tables — migration 0005
--
-- Claims (837P/I) + claim lines + remittance (835) + status (276/277).
-- =====================================================================

CREATE TABLE IF NOT EXISTS claims (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_control_number     varchar(20) NOT NULL UNIQUE,            -- our internal CCN, used in EDI
  patient_id               uuid NOT NULL,                          -- → patients
  billing_provider_id      uuid NOT NULL,                          -- → providers
  rendering_provider_id    uuid,                                   -- if different from billing
  payer_id                 text NOT NULL,
  state_code               varchar(2) NOT NULL,
  claim_type               text NOT NULL CHECK (claim_type IN ('837P','837I')),
  service_from             date NOT NULL,
  service_to               date NOT NULL,
  diagnosis_codes          text[] NOT NULL DEFAULT ARRAY[]::text[],   -- ICD-10
  total_charge_cents       bigint NOT NULL CHECK (total_charge_cents >= 0),
  total_paid_cents         bigint,
  status                   text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','validated','submitted','fraud_review','paid','denied','appealed','withdrawn','expired'
  )),
  pa_request_id            uuid,                                   -- → pa_requests, if PA was required
  edi_payload              text,                                   -- generated 837 text
  edi_generated_at         timestamptz,
  submitted_at             timestamptz,
  adjudicated_at           timestamptz,
  fraud_score              integer CHECK (fraud_score BETWEEN 1 AND 100),
  fraud_recommendation     text,                                   -- auto_pay | route_to_review | auto_block
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  created_by               uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS claims_status_idx   ON claims(status);
CREATE INDEX IF NOT EXISTS claims_patient_idx  ON claims(patient_id);
CREATE INDEX IF NOT EXISTS claims_provider_idx ON claims(billing_provider_id);
CREATE INDEX IF NOT EXISTS claims_state_idx    ON claims(state_code, status);
CREATE INDEX IF NOT EXISTS claims_submitted_idx ON claims(submitted_at DESC) WHERE submitted_at IS NOT NULL;

DROP TRIGGER IF EXISTS claims_set_updated_at ON claims;
CREATE TRIGGER claims_set_updated_at BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS claim_lines (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id                 uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  line_number              integer NOT NULL,
  service_code             text NOT NULL,
  service_code_type        text NOT NULL CHECK (service_code_type IN ('CPT','HCPCS','REVENUE')),
  modifier_1               varchar(2),
  modifier_2               varchar(2),
  modifier_3               varchar(2),
  modifier_4               varchar(2),
  units                    numeric(10,2) NOT NULL DEFAULT 1,
  charge_cents             bigint NOT NULL CHECK (charge_cents >= 0),
  diagnosis_pointers       integer[] NOT NULL DEFAULT ARRAY[]::int[],    -- 1-based indices into claims.diagnosis_codes
  service_date             date NOT NULL,
  place_of_service         varchar(2) NOT NULL,
  rendering_provider_id    uuid,
  UNIQUE (claim_id, line_number)
);
CREATE INDEX IF NOT EXISTS claim_lines_claim_idx ON claim_lines(claim_id);

-- RLS
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS claims_read ON claims;
CREATE POLICY claims_read ON claims FOR SELECT USING (
  app_role_is_cross_state()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','billing_manager',
                              'compliance_officer','fraud_investigator','denial_appeals_specialist')
      AND state_code = app_current_state_code())
  OR billing_provider_id = app_current_user_id()
  OR rendering_provider_id = app_current_user_id()
);

DROP POLICY IF EXISTS claims_write ON claims;
CREATE POLICY claims_write ON claims FOR ALL USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('billing_manager', 'individual_provider', 'facility_provider')
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('billing_manager', 'individual_provider', 'facility_provider')
);

ALTER TABLE claim_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS claim_lines_all ON claim_lines;
CREATE POLICY claim_lines_all ON claim_lines FOR ALL USING (
  EXISTS (SELECT 1 FROM claims c WHERE c.id = claim_id)
) WITH CHECK (true);

-- Sequence for CCN generation. Format: yyMMdd-NNNNNN
CREATE SEQUENCE IF NOT EXISTS claim_ccn_seq;
