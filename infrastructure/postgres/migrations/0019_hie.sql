BEGIN;

-- FHIR R4 resource store: persists inbound/outbound FHIR resources from external HIEs
CREATE TABLE IF NOT EXISTS fhir_resources (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT        NOT NULL,  -- Patient | Encounter | Observation | Condition | MedicationRequest
  fhir_id       TEXT        NOT NULL UNIQUE,
  patient_id    UUID        REFERENCES patients(id),
  state_code    CHAR(2)     NOT NULL,
  resource_data JSONB       NOT NULL,
  source_system TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fhir_patient_idx ON fhir_resources(patient_id);
CREATE INDEX IF NOT EXISTS fhir_type_idx    ON fhir_resources(resource_type);

-- Row-level security: enforce state-scoped access
ALTER TABLE fhir_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY fhir_resources_state_isolation ON fhir_resources
  USING (
    current_setting('rls.state_code', true) IS NULL
    OR state_code = current_setting('rls.state_code', true)
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_fhir_resources_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER fhir_resources_updated_at
  BEFORE UPDATE ON fhir_resources
  FOR EACH ROW EXECUTE FUNCTION update_fhir_resources_updated_at();

-- Referrals: provider-to-provider referrals with FHIR ServiceRequest backing
CREATE TABLE IF NOT EXISTS referrals (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_provider_id        UUID        NOT NULL REFERENCES providers(id),
  to_provider_id          UUID        REFERENCES providers(id),
  patient_id              UUID        NOT NULL REFERENCES patients(id),
  state_code              CHAR(2)     NOT NULL,
  reason                  TEXT        NOT NULL,
  priority                TEXT        NOT NULL DEFAULT 'routine',  -- stat | urgent | routine | elective
  status                  TEXT        NOT NULL DEFAULT 'pending',  -- pending | accepted | completed | declined | cancelled
  fhir_service_request_id TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID        NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS referrals_from_provider_idx ON referrals(from_provider_id);
CREATE INDEX IF NOT EXISTS referrals_to_provider_idx   ON referrals(to_provider_id);
CREATE INDEX IF NOT EXISTS referrals_patient_idx       ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx        ON referrals(status);
CREATE INDEX IF NOT EXISTS referrals_state_idx         ON referrals(state_code);

-- Row-level security
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY referrals_state_isolation ON referrals
  USING (
    current_setting('rls.state_code', true) IS NULL
    OR state_code = current_setting('rls.state_code', true)
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_referrals_updated_at();

COMMIT;
