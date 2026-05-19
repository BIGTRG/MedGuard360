-- hie-service tables — migration 0017
-- HIE referrals, FHIR R4 consent, and outbound document traces.

CREATE TABLE IF NOT EXISTS hie_referrals (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fhir_resource_id       text UNIQUE NOT NULL,                  -- 'ServiceRequest/abc...'
  patient_id             uuid NOT NULL,
  referring_provider_id  uuid NOT NULL,
  receiving_provider_id  uuid,
  receiving_org_name     text,
  state_code             varchar(2) NOT NULL,
  service_requested      text NOT NULL,
  reason                 text,
  priority               text NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','asap','stat')),
  status                 text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','revoked','cancelled')),
  fhir_payload           jsonb NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS hie_ref_patient_idx ON hie_referrals(patient_id);
CREATE INDEX IF NOT EXISTS hie_ref_state_status ON hie_referrals(state_code, status);

DROP TRIGGER IF EXISTS hie_ref_set_updated_at ON hie_referrals;
CREATE TRIGGER hie_ref_set_updated_at BEFORE UPDATE ON hie_referrals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS hie_consents (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id             uuid NOT NULL,
  scope                  text NOT NULL,                          -- 'all', 'mental_health', 'substance_use', 'reproductive', etc.
  granted_to_org         text NOT NULL,
  effective_from         date NOT NULL,
  effective_to           date,
  status                 text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  fhir_resource_id       text UNIQUE,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hie_consents_patient_idx ON hie_consents(patient_id) WHERE status = 'active';

DROP TRIGGER IF EXISTS hie_consents_set_updated_at ON hie_consents;
CREATE TRIGGER hie_consents_set_updated_at BEFORE UPDATE ON hie_consents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE hie_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hie_ref_all ON hie_referrals;
CREATE POLICY hie_ref_all ON hie_referrals FOR ALL USING (
  app_role_is_cross_state()
  OR referring_provider_id = app_current_user_id()
  OR receiving_provider_id = app_current_user_id()
  OR (app_current_role() IN ('hie_administrator','state_medicaid_agency','compliance_officer')
      AND state_code = app_current_state_code())
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('hie_administrator','individual_provider','facility_provider','platform_administrator')
);

ALTER TABLE hie_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hie_consents_all ON hie_consents;
CREATE POLICY hie_consents_all ON hie_consents FOR ALL USING (
  app_role_is_cross_state()
  OR (app_current_role() = 'patient' AND patient_id = app_current_user_id())
  OR app_current_role() IN ('hie_administrator','compliance_officer','individual_provider','facility_provider')
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('patient','hie_administrator','individual_provider','facility_provider','platform_administrator')
);
