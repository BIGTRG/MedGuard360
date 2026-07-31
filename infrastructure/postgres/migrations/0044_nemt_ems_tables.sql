-- NEMT (Non-Emergency Medical Transportation) / Ambulance & EMS Tables
-- HCPCS A0426-A0436, mileage billing, NREMT credentialing, trip tracking

-- NEMT/Ambulance Claims Tracking
CREATE TABLE IF NOT EXISTS nemt_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  ambulance_provider_npi VARCHAR(10) NOT NULL,
  service_type VARCHAR(50), -- ground | air
  hcpcs_code VARCHAR(10) NOT NULL, -- A0426-A0436
  service_level VARCHAR(50), -- BLS | ALS | ALS_Paramedic
  location_type VARCHAR(20), -- rural | urban
  pickup_date TIMESTAMP WITH TIME ZONE NOT NULL,
  dropoff_date TIMESTAMP WITH TIME ZONE,
  origin_address VARCHAR(500),
  origin_latitude NUMERIC(11, 8),
  origin_longitude NUMERIC(11, 8),
  destination_address VARCHAR(500),
  destination_latitude NUMERIC(11, 8),
  destination_longitude NUMERIC(11, 8),
  loaded_miles NUMERIC(8, 2),
  unloaded_miles NUMERIC(8, 2),
  total_miles NUMERIC(8, 2),
  base_rate NUMERIC(10, 2),
  mileage_rate NUMERIC(6, 2),
  mileage_amount NUMERIC(10, 2),
  total_amount NUMERIC(10, 2),
  status VARCHAR(20), -- submitted | paid | denied
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nemt_claim_patient ON nemt_claims(patient_id);
CREATE INDEX idx_nemt_claim_provider ON nemt_claims(ambulance_provider_npi);
CREATE INDEX idx_nemt_claim_hcpcs ON nemt_claims(hcpcs_code);

-- EMS Provider Credentials (NREMT certification)
CREATE TABLE IF NOT EXISTS ems_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credentialing_id VARCHAR(255) NOT NULL UNIQUE,
  npi VARCHAR(10) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  nremt_number VARCHAR(50) NOT NULL UNIQUE,
  nremt_level VARCHAR(50) NOT NULL, -- EMR | EMT_Basic | EMT_Intermediate | EMT_Paramedic
  nremt_expiration_date DATE NOT NULL,
  ambulance_service_id VARCHAR(255),
  state_code VARCHAR(2),
  status VARCHAR(20), -- submitted | approved | denied | expired
  approval_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ems_credentials_npi ON ems_provider_credentials(npi);
CREATE INDEX idx_ems_credentials_nremt_level ON ems_provider_credentials(nremt_level);
CREATE INDEX idx_ems_credentials_status ON ems_provider_credentials(status);

-- GPS Trip Tracking (for EVV-like verification)
CREATE TABLE IF NOT EXISTS nemt_gps_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id VARCHAR(255) NOT NULL UNIQUE,
  ambulance_provider_npi VARCHAR(10) NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id),
  pickup_time TIMESTAMP WITH TIME ZONE NOT NULL,
  dropoff_time TIMESTAMP WITH TIME ZONE,
  gps_coordinates JSONB, -- Array of lat/lon points
  trip_distance NUMERIC(8, 2),
  trip_duration_minutes INTEGER,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gps_tracking_trip ON nemt_gps_tracking(trip_id);
CREATE INDEX idx_gps_tracking_patient ON nemt_gps_tracking(patient_id);

-- Health Facilities (approved ambulance destinations)
CREATE TABLE IF NOT EXISTS health_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_name VARCHAR(255) NOT NULL,
  facility_type VARCHAR(50), -- hospital | urgent_care | specialty_clinic | dialysis_center | rehabilitation | snf
  state_code VARCHAR(2),
  latitude NUMERIC(11, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  accepts_ambulance_patients BOOLEAN DEFAULT TRUE,
  is_approved_destination BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facility_state ON health_facilities(state_code);
CREATE INDEX idx_facility_type ON health_facilities(facility_type);
CREATE INDEX idx_facility_approved_destination ON health_facilities(is_approved_destination);

-- HCPCS Ambulance Code Reference
CREATE TABLE IF NOT EXISTS hcpcs_ambulance_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hcpcs_code VARCHAR(10) NOT NULL UNIQUE,
  description VARCHAR(500),
  service_level VARCHAR(50), -- BLS | ALS | ALS_Paramedic
  modality VARCHAR(20), -- ground | air
  state_code VARCHAR(2),
  base_rate NUMERIC(10, 2),
  mileage_rate NUMERIC(6, 2),
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed HCPCS ambulance codes
INSERT INTO hcpcs_ambulance_codes (hcpcs_code, description, service_level, modality, base_rate, mileage_rate, effective_date)
VALUES
  ('A0426', 'Ambulance service, private, basic life support', 'BLS', 'ground', 200.00, 1.50, '2021-07-01'),
  ('A0427', 'Ambulance service, private, advanced life support', 'ALS', 'ground', 250.00, 1.50, '2021-07-01'),
  ('A0429', 'Ambulance service, private, paramedic', 'ALS_Paramedic', 'ground', 300.00, 1.50, '2021-07-01'),
  ('A0430', 'Ambulance service, commercial, basic life support', 'BLS', 'ground', 210.00, 1.50, '2021-07-01'),
  ('A0431', 'Ambulance service, commercial, advanced life support', 'ALS', 'ground', 260.00, 1.50, '2021-07-01'),
  ('A0432', 'Ambulance service, commercial, paramedic', 'ALS_Paramedic', 'ground', 310.00, 1.50, '2021-07-01'),
  ('A0433', 'Ambulance service, rural, basic life support', 'BLS', 'ground', 180.00, 1.50, '2021-07-01'),
  ('A0434', 'Ambulance service, rural, advanced life support', 'ALS', 'ground', 230.00, 1.50, '2021-07-01'),
  ('A0435', 'Ambulance service, rural, paramedic', 'ALS_Paramedic', 'ground', 280.00, 1.50, '2021-07-01'),
  ('A0436', 'Ambulance service, air', 'ALS', 'air', 1500.00, 0.00, '2021-07-01')
ON CONFLICT (hcpcs_code) DO NOTHING;

-- Audit
SELECT 'NEMT/EMS tables created' AS status;
