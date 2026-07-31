-- Service Verification Core Engine Tables
-- Biometric verification, credential status, GPS geofencing, authorization hours

CREATE TABLE IF NOT EXISTS biometric_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id VARCHAR(255) NOT NULL UNIQUE,
  worker_id UUID NOT NULL REFERENCES providers(id),
  verification_type VARCHAR(50) NOT NULL, -- facial_recognition | fingerprint | combined
  verification_result VARCHAR(50) NOT NULL, -- match | no_match | inconclusive
  confidence NUMERIC(5, 2) NOT NULL, -- 0-100 confidence score
  is_approved BOOLEAN NOT NULL,
  vendor_response TEXT, -- Raw response from Suprema/NEC
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_biometric_worker_id ON biometric_verifications(worker_id);
CREATE INDEX idx_biometric_verification_result ON biometric_verifications(verification_result);
CREATE INDEX idx_biometric_is_approved ON biometric_verifications(is_approved);

-- Location validations — GPS geofence checks
CREATE TABLE IF NOT EXISTS location_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES providers(id),
  service_code VARCHAR(10) NOT NULL,
  latitude NUMERIC(11, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  is_within_geofence BOOLEAN NOT NULL,
  matched_location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_location_validation_worker ON location_validations(worker_id);
CREATE INDEX idx_location_validation_geofence ON location_validations(is_within_geofence);
CREATE INDEX idx_location_validation_created_at ON location_validations(created_at);

-- Service authorization hours — when workers can bill for specific services
CREATE TABLE IF NOT EXISTS service_authorization_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES providers(id),
  service_code VARCHAR(10) NOT NULL, -- HCPCS code
  day_of_week INTEGER NOT NULL, -- 0-6 (Sun-Sat)
  start_hour INTEGER NOT NULL, -- 0-23
  end_hour INTEGER NOT NULL, -- 0-23
  approved BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, service_code, day_of_week)
);

CREATE INDEX idx_service_auth_hours_worker ON service_authorization_hours(worker_id);
CREATE INDEX idx_service_auth_hours_service_code ON service_authorization_hours(service_code);

-- Authorization checks — audit trail of when workers attempted to bill
CREATE TABLE IF NOT EXISTS authorization_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES providers(id),
  service_code VARCHAR(10) NOT NULL,
  check_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_within_authorized_hours BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_check_worker ON authorization_checks(worker_id);
CREATE INDEX idx_auth_check_service_code ON authorization_checks(service_code);
CREATE INDEX idx_auth_check_check_time ON authorization_checks(check_time);

-- Service eligibility checks — comprehensive pre-service verification
CREATE TABLE IF NOT EXISTS service_eligibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id VARCHAR(255) NOT NULL UNIQUE,
  worker_id UUID NOT NULL REFERENCES providers(id),
  service_code VARCHAR(10) NOT NULL,
  biometric_approved BOOLEAN NOT NULL,
  credential_approved BOOLEAN NOT NULL,
  location_approved BOOLEAN NOT NULL,
  hours_approved BOOLEAN NOT NULL,
  overall_approved BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eligibility_check_worker ON service_eligibility_checks(worker_id);
CREATE INDEX idx_eligibility_check_overall ON service_eligibility_checks(overall_approved);
CREATE INDEX idx_eligibility_check_created_at ON service_eligibility_checks(created_at);

-- Add authorization hours to providers table if not exists
ALTER TABLE providers ADD COLUMN IF NOT EXISTS service_authorization_hours TEXT[]; -- array of service codes with hours

-- Seed example authorization hours for NC providers
INSERT INTO service_authorization_hours
  (worker_id, service_code, day_of_week, start_hour, end_hour, approved)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'T1003', 0, 8, 18, TRUE),  -- Community-based residential support (Mon-Fri, 8am-6pm)
  ('00000000-0000-0000-0000-000000000002', 'T1003', 1, 8, 18, TRUE),
  ('00000000-0000-0000-0000-000000000002', 'T1003', 2, 8, 18, TRUE),
  ('00000000-0000-0000-0000-000000000002', 'T1003', 3, 8, 18, TRUE),
  ('00000000-0000-0000-0000-000000000002', 'T1003', 4, 8, 18, TRUE),
  ('00000000-0000-0000-0000-000000000002', 'T1004', 0, 9, 17, TRUE),  -- Community-based day support
  ('00000000-0000-0000-0000-000000000002', 'T1004', 1, 9, 17, TRUE),
  ('00000000-0000-0000-0000-000000000002', 'T1004', 2, 9, 17, TRUE),
  ('00000000-0000-0000-0000-000000000002', 'T1004', 3, 9, 17, TRUE),
  ('00000000-0000-0000-0000-000000000002', 'T1004', 4, 9, 17, TRUE),
  ('00000000-0000-0000-0000-000000000002', 'T2025', 0, 10, 14, TRUE)  -- Adult day health
ON CONFLICT (worker_id, service_code, day_of_week) DO NOTHING;

-- Audit
SELECT 'Service verification tables created' AS status;
