-- pharmacy-service tables — migration 0015

CREATE TABLE IF NOT EXISTS pharmacy_claims (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_control_number   varchar(20) NOT NULL UNIQUE,
  patient_id             uuid NOT NULL,
  prescribing_provider_id uuid NOT NULL,
  pharmacy_provider_id   uuid NOT NULL,
  payer_id               text NOT NULL,
  state_code             varchar(2) NOT NULL,
  ndc                    varchar(11) NOT NULL,
  drug_name              text NOT NULL,
  quantity_dispensed     numeric(10,3) NOT NULL,
  days_supply            integer NOT NULL CHECK (days_supply > 0),
  refill_number          integer NOT NULL DEFAULT 0,
  total_charge_cents     bigint NOT NULL CHECK (total_charge_cents >= 0),
  prior_auth_id          uuid,
  date_of_service        date NOT NULL,
  status                 text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted','approved','rejected','reversed','paid'
  )),
  rejection_code         text,                                   -- NCPDP reject code
  ncpdp_payload          text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS pharm_state_status_idx ON pharmacy_claims(state_code, status);
CREATE INDEX IF NOT EXISTS pharm_patient_idx ON pharmacy_claims(patient_id);
CREATE INDEX IF NOT EXISTS pharm_ndc_idx ON pharmacy_claims(ndc);

DROP TRIGGER IF EXISTS pharm_set_updated_at ON pharmacy_claims;
CREATE TRIGGER pharm_set_updated_at BEFORE UPDATE ON pharmacy_claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS formulary_entries (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code          varchar(2) NOT NULL,
  payer_id            text NOT NULL,
  ndc                 varchar(11) NOT NULL,
  drug_name           text NOT NULL,
  tier                integer NOT NULL,
  pa_required         boolean NOT NULL DEFAULT FALSE,
  step_therapy        boolean NOT NULL DEFAULT FALSE,
  quantity_limit      integer,
  effective_from      date NOT NULL,
  effective_to        date,
  UNIQUE (state_code, payer_id, ndc, effective_from)
);
CREATE INDEX IF NOT EXISTS formulary_lookup ON formulary_entries(state_code, payer_id, ndc);

ALTER TABLE pharmacy_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pharm_read ON pharmacy_claims;
CREATE POLICY pharm_read ON pharmacy_claims FOR SELECT USING (
  app_role_is_cross_state()
  OR pharmacy_provider_id = app_current_user_id()
  OR prescribing_provider_id = app_current_user_id()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','pharmacy','billing_manager','fraud_investigator')
      AND state_code = app_current_state_code())
);
DROP POLICY IF EXISTS pharm_write ON pharmacy_claims;
CREATE POLICY pharm_write ON pharmacy_claims FOR ALL USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('pharmacy','billing_manager','platform_administrator')
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('pharmacy','billing_manager','platform_administrator')
);
