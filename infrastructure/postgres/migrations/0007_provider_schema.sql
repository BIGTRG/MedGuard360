-- provider-service tables — migration 0007

CREATE TABLE IF NOT EXISTS providers (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  uuid REFERENCES users(id),               -- nullable: facilities/groups are providers too
  npi                      varchar(10) NOT NULL UNIQUE CHECK (npi ~ '^\d{10}$'),
  ein                      varchar(20),
  type                     text NOT NULL CHECK (type IN ('individual','facility','group','pharmacy','dmepos','nemt')),
  legal_name               text NOT NULL,
  doing_business_as        text,
  email                    citext,
  phone                    text,
  primary_taxonomy_code    varchar(10),                              -- NUCC taxonomy
  enrolled_medicaid_states text[] NOT NULL DEFAULT ARRAY[]::text[],
  enrolled_medicare        boolean NOT NULL DEFAULT FALSE,
  status                   text NOT NULL DEFAULT 'pending_credentialing'
                           CHECK (status IN ('pending_credentialing','active','suspended','terminated')),
  state_code               varchar(2),                              -- primary state for RLS scoping
  org_id                   uuid,                                    -- parent group/facility
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  created_by               uuid REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS providers_state_idx ON providers(state_code);
CREATE INDEX IF NOT EXISTS providers_type_idx  ON providers(type);
CREATE INDEX IF NOT EXISTS providers_status_idx ON providers(status);
CREATE INDEX IF NOT EXISTS providers_user_idx ON providers(user_id);
CREATE INDEX IF NOT EXISTS providers_enrolled_states_gin ON providers USING GIN(enrolled_medicaid_states);

DROP TRIGGER IF EXISTS providers_set_updated_at ON providers;
CREATE TRIGGER providers_set_updated_at BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS provider_specialties (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id         uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  taxonomy_code       varchar(10) NOT NULL,
  taxonomy_description text NOT NULL,
  is_primary          boolean NOT NULL DEFAULT FALSE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, taxonomy_code)
);
CREATE INDEX IF NOT EXISTS provider_specialties_provider ON provider_specialties(provider_id);

CREATE TABLE IF NOT EXISTS provider_locations (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  label           text NOT NULL,
  address_line1   text NOT NULL,
  address_line2   text,
  city            text NOT NULL,
  state_code      varchar(2) NOT NULL,
  postal_code     varchar(10) NOT NULL,
  latitude        numeric(9,6),
  longitude       numeric(9,6),
  is_primary      boolean NOT NULL DEFAULT FALSE,
  active          boolean NOT NULL DEFAULT TRUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_locations_provider ON provider_locations(provider_id);
CREATE INDEX IF NOT EXISTS provider_locations_state ON provider_locations(state_code);

DROP TRIGGER IF EXISTS provider_locations_set_updated_at ON provider_locations;
CREATE TRIGGER provider_locations_set_updated_at BEFORE UPDATE ON provider_locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS providers_read ON providers;
CREATE POLICY providers_read ON providers FOR SELECT USING (
  app_role_is_cross_state()
  OR user_id = app_current_user_id()                                   -- self
  OR (state_code = app_current_state_code()
      AND app_current_role() IN ('state_medicaid_agency','mco_admin','credentialing_specialist',
                                  'compliance_officer','fraud_investigator','prior_auth_specialist',
                                  'billing_manager'))
  OR (app_current_role() IN ('patient', 'individual_provider', 'facility_provider')
      AND status = 'active')                                            -- patients/peers can see active provider directory
);

DROP POLICY IF EXISTS providers_write ON providers;
CREATE POLICY providers_write ON providers FOR ALL USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('credentialing_specialist', 'platform_administrator')
  OR user_id = app_current_user_id()                                    -- self-update of profile
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('credentialing_specialist', 'platform_administrator')
  OR user_id = app_current_user_id()
);

ALTER TABLE provider_specialties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS provider_specialties_all ON provider_specialties;
CREATE POLICY provider_specialties_all ON provider_specialties FOR ALL
  USING (EXISTS (SELECT 1 FROM providers p WHERE p.id = provider_id)) WITH CHECK (true);

ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS provider_locations_all ON provider_locations;
CREATE POLICY provider_locations_all ON provider_locations FOR ALL
  USING (EXISTS (SELECT 1 FROM providers p WHERE p.id = provider_id)) WITH CHECK (true);
