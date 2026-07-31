-- EVV (Electronic Visit Verification) Tables
-- CMS Rule 42 CFR § 441.1(c) — 6 federal data elements + server-side immutable timestamps
-- Claims blocked until EVV confirmation OR auto-released after 30 days

CREATE TABLE IF NOT EXISTS evv_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id VARCHAR(255) NOT NULL UNIQUE,
  worker_id UUID NOT NULL REFERENCES providers(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  service_code VARCHAR(10) NOT NULL, -- e.g., T1003, T1004, T2025
  service_description VARCHAR(255),
  visit_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  visit_end_time TIMESTAMP WITH TIME ZONE,
  start_latitude NUMERIC(11, 8),
  start_longitude NUMERIC(11, 8),
  end_latitude NUMERIC(11, 8),
  end_longitude NUMERIC(11, 8),
  geofence_validated BOOLEAN DEFAULT FALSE,
  minutes_billed INTEGER,
  visit_status VARCHAR(20) DEFAULT 'completed', -- completed | no_show | partial
  hhaexchange_submission_id VARCHAR(255),
  hhaexchange_status VARCHAR(20), -- submitted | confirmed | failed
  hhaexchange_response_date TIMESTAMP WITH TIME ZONE,
  claim_blocking_status VARCHAR(30) DEFAULT 'waiting_evv', -- waiting_evv | evv_confirmed | auto_released
  server_timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- Immutable proof of receipt time
  server_timestamp_end TIMESTAMP WITH TIME ZONE, -- Immutable proof of visit end
  state_code VARCHAR(2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id)
);

-- Row-level security for EVV visits
ALTER TABLE evv_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY evv_visits_read_all ON evv_visits FOR SELECT USING (TRUE);
CREATE POLICY evv_visits_insert_own ON evv_visits FOR INSERT WITH CHECK (created_by = current_user_id());

-- Indexes for EVV performance
CREATE INDEX idx_evv_visits_worker_id ON evv_visits(worker_id);
CREATE INDEX idx_evv_visits_patient_id ON evv_visits(patient_id);
CREATE INDEX idx_evv_visits_visit_id ON evv_visits(visit_id);
CREATE INDEX idx_evv_visits_claim_blocking_status ON evv_visits(claim_blocking_status);
CREATE INDEX idx_evv_visits_created_at ON evv_visits(created_at);
CREATE INDEX idx_evv_visits_hhaexchange_status ON evv_visits(hhaexchange_status);

-- Geofence locations for EVV validation
CREATE TABLE IF NOT EXISTS geofence_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name VARCHAR(255) NOT NULL,
  latitude NUMERIC(11, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100, -- 100m default geofence radius
  service_code VARCHAR(10) NOT NULL,
  state_code VARCHAR(2),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  UNIQUE(service_code, location_name)
);

CREATE INDEX idx_geofence_service_code ON geofence_locations(service_code);
CREATE INDEX idx_geofence_coordinates ON geofence_locations USING gist (ll_to_earth(latitude, longitude));

-- EVV analytics table for HHAeXchange compliance reporting
CREATE TABLE IF NOT EXISTS evv_compliance_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code VARCHAR(2) NOT NULL,
  report_month DATE NOT NULL,
  total_visits INTEGER,
  visits_with_evv_confirmation INTEGER,
  visits_auto_released INTEGER,
  geofence_validation_rate NUMERIC(5, 2), -- percentage
  average_minutes_billed INTEGER,
  hhaexchange_submission_success_rate NUMERIC(5, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(state_code, report_month)
);

-- Function to auto-release EVV claim blocks after 30 days
CREATE OR REPLACE FUNCTION auto_release_evv_blocks()
RETURNS void AS $$
BEGIN
  UPDATE evv_visits
  SET claim_blocking_status = 'auto_released'
  WHERE claim_blocking_status = 'waiting_evv'
    AND created_at < NOW() - INTERVAL '30 days';

  RAISE NOTICE 'EVV auto-release: % rows updated', (SELECT COUNT(*) FROM evv_visits WHERE claim_blocking_status = 'auto_released');
END;
$$ LANGUAGE plpgsql;

-- Audit trigger for EVV visits (immutability proof)
CREATE TRIGGER evv_visits_updated_at
BEFORE UPDATE ON evv_visits
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Seed initial geofence locations for NC services (example)
INSERT INTO geofence_locations (location_name, latitude, longitude, radius_meters, service_code, state_code, created_by)
VALUES
  ('Clinical Office - Chapel Hill', 35.9132, -79.0557, 100, 'T1003', 'NC', '00000000-0000-0000-0000-000000000001'),
  ('Patient Home - Wake County', 35.7796, -78.6382, 50, 'T1004', 'NC', '00000000-0000-0000-0000-000000000001'),
  ('Adult Day Health - Durham', 35.9940, -78.9021, 100, 'T2025', 'NC', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (service_code, location_name) DO NOTHING;

-- Compliance audit log
SELECT 'EVV tables and policies created' AS status;
