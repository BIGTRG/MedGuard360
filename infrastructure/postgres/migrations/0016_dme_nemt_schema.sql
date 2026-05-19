-- dme-service + nemt-service tables — migration 0016

-- DME (Durable Medical Equipment, Prosthetics, Orthotics, Supplies)
CREATE TABLE IF NOT EXISTS dme_orders (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id             uuid NOT NULL,
  prescribing_provider_id uuid NOT NULL,
  supplier_provider_id   uuid NOT NULL,
  payer_id               text NOT NULL,
  state_code             varchar(2) NOT NULL,
  hcpcs_code             text NOT NULL,                          -- e.g. E0601 CPAP
  description            text NOT NULL,
  modifier_1             varchar(2),
  modifier_2             varchar(2),
  quantity               integer NOT NULL DEFAULT 1,
  rental_or_purchase     text NOT NULL CHECK (rental_or_purchase IN ('rental','purchase')),
  rental_months          integer,
  total_charge_cents     bigint NOT NULL CHECK (total_charge_cents >= 0),
  prior_auth_id          uuid,
  cmn_complete           boolean NOT NULL DEFAULT FALSE,           -- Certificate of Medical Necessity
  date_of_service        date NOT NULL,
  status                 text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','delivered','billed','denied','cancelled')),
  delivery_address       text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS dme_state_status_idx ON dme_orders(state_code, status);
CREATE INDEX IF NOT EXISTS dme_patient_idx ON dme_orders(patient_id);

DROP TRIGGER IF EXISTS dme_set_updated_at ON dme_orders;
CREATE TRIGGER dme_set_updated_at BEFORE UPDATE ON dme_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE dme_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dme_read ON dme_orders;
CREATE POLICY dme_read ON dme_orders FOR SELECT USING (
  app_role_is_cross_state()
  OR supplier_provider_id = app_current_user_id()
  OR prescribing_provider_id = app_current_user_id()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','dmepos_supplier','billing_manager','fraud_investigator')
      AND state_code = app_current_state_code())
);
DROP POLICY IF EXISTS dme_write ON dme_orders;
CREATE POLICY dme_write ON dme_orders FOR ALL USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('dmepos_supplier','individual_provider','facility_provider','platform_administrator')
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('dmepos_supplier','individual_provider','facility_provider','platform_administrator')
);

-- NEMT (Non-Emergency Medical Transport)
CREATE TABLE IF NOT EXISTS nemt_trips (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id             uuid NOT NULL,
  broker_id              uuid NOT NULL,
  driver_id              uuid,
  payer_id               text NOT NULL,
  state_code             varchar(2) NOT NULL,
  hcpcs_code             text NOT NULL DEFAULT 'A0100',           -- non-emergency taxi
  trip_type              text NOT NULL CHECK (trip_type IN ('one_way','round_trip','recurring')),
  pickup_address         text NOT NULL,
  pickup_latitude        numeric(9,6),
  pickup_longitude       numeric(9,6),
  destination_address    text NOT NULL,
  destination_latitude   numeric(9,6),
  destination_longitude  numeric(9,6),
  scheduled_pickup_at    timestamptz NOT NULL,
  actual_pickup_at       timestamptz,
  actual_dropoff_at      timestamptz,
  miles_billed           numeric(8,2),
  total_charge_cents     bigint,
  appointment_id         text,
  status                 text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','en_route','completed','no_show','cancelled')),
  gps_track              jsonb,                                    -- array of {lat, lng, t}
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS nemt_state_status_idx ON nemt_trips(state_code, status);
CREATE INDEX IF NOT EXISTS nemt_patient_idx ON nemt_trips(patient_id);
CREATE INDEX IF NOT EXISTS nemt_scheduled_idx ON nemt_trips(scheduled_pickup_at);

DROP TRIGGER IF EXISTS nemt_set_updated_at ON nemt_trips;
CREATE TRIGGER nemt_set_updated_at BEFORE UPDATE ON nemt_trips
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE nemt_trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nemt_all ON nemt_trips;
CREATE POLICY nemt_all ON nemt_trips FOR ALL USING (
  app_role_is_cross_state()
  OR broker_id = app_current_user_id()
  OR driver_id = app_current_user_id()
  OR (state_code = app_current_state_code()
      AND app_current_role() IN ('state_medicaid_agency','mco_admin','nemt_broker','billing_manager','fraud_investigator'))
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('nemt_broker','platform_administrator','individual_provider','facility_provider')
);
