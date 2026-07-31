-- Final Service Tables: Epic Integration, Statewide Hub, Children & Families

-- Hub Call Tracking
CREATE TABLE IF NOT EXISTS hub_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id VARCHAR(255) NOT NULL UNIQUE,
  twilio_call_sid VARCHAR(255) UNIQUE,
  caller_number VARCHAR(20),
  inbound BOOLEAN,
  call_start_time TIMESTAMP WITH TIME ZONE,
  call_end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  tier_level VARCHAR(50), -- tier1_chatbot | tier2_agent | tier3_crisis_specialist
  tier_escalation_count INTEGER DEFAULT 0,
  recording_url VARCHAR(500),
  transcription TEXT,
  status VARCHAR(20), -- active | completed | abandoned
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hub_call_status ON hub_calls(status);
CREATE INDEX idx_hub_call_tier ON hub_calls(tier_level);

-- CFSP (Comprehensive Family Support Program) Enrollments
CREATE TABLE IF NOT EXISTS cfsp_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  cfsp_eligibility_date DATE NOT NULL,
  status VARCHAR(20), -- active | inactive | suspended
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cfsp_patient ON cfsp_enrollments(patient_id);
CREATE INDEX idx_cfsp_status ON cfsp_enrollments(status);

-- School Enrollments (school-based Medicaid)
CREATE TABLE IF NOT EXISTS school_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  school_name VARCHAR(255) NOT NULL,
  lea_code VARCHAR(20), -- Local Education Agency code
  classroom_support TEXT,
  student_needs JSONB,
  enrollment_date DATE NOT NULL,
  status VARCHAR(20), -- active | graduated | withdrawn
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_school_enrollment_patient ON school_enrollments(patient_id);
CREATE INDEX idx_school_enrollment_school ON school_enrollments(school_name);

-- Waiver Enrollments (CAP/C, CAP/DA)
CREATE TABLE IF NOT EXISTS waiver_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  waiver_type VARCHAR(50) NOT NULL, -- CAP/C | CAP/DA | Tailored Plan
  waiver_start_date DATE NOT NULL,
  waiver_end_date DATE,
  status VARCHAR(20), -- active | expired | suspended
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waiver_enrollment_patient ON waiver_enrollments(patient_id);
CREATE INDEX idx_waiver_enrollment_type ON waiver_enrollments(waiver_type);

-- Foster Care Enrollments (NC DSS coordination)
CREATE TABLE IF NOT EXISTS foster_care_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id VARCHAR(255) NOT NULL UNIQUE,
  child_id UUID NOT NULL REFERENCES patients(id),
  foster_parent_id UUID REFERENCES patients(id),
  dss_worker_npi VARCHAR(10),
  enrollment_date DATE NOT NULL,
  placement_date DATE,
  reunification_plan TEXT,
  status VARCHAR(20), -- in_care | reunified | aged_out | placed_with_relatives
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_foster_care_child ON foster_care_enrollments(child_id);

-- Waiver Service Rates (CAP/C, CAP/DA)
CREATE TABLE IF NOT EXISTS waiver_service_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code VARCHAR(10) NOT NULL,
  waiver_type VARCHAR(50) NOT NULL,
  rate NUMERIC(10, 2) NOT NULL,
  state_code VARCHAR(2),
  effective_date DATE NOT NULL,
  UNIQUE(service_code, waiver_type, state_code)
);

-- Caregiver Background Checks
CREATE TABLE IF NOT EXISTS caregiver_background_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id VARCHAR(255) NOT NULL UNIQUE,
  caregiver_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  ssn VARCHAR(11),
  check_date DATE NOT NULL,
  cleared BOOLEAN,
  disqualifying_factors TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_caregiver_check_cleared ON caregiver_background_checks(cleared);

-- Epic FHIR Integration Log
CREATE TABLE IF NOT EXISTS epic_fhir_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  epic_patient_id VARCHAR(255),
  sync_type VARCHAR(50), -- demographics | labs | allergies | medications | encounters
  fhir_resource_type VARCHAR(100),
  sync_status VARCHAR(20), -- successful | failed | pending
  sync_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_epic_sync_patient ON epic_fhir_syncs(patient_id);
CREATE INDEX idx_epic_sync_status ON epic_fhir_syncs(sync_status);

-- Audit
SELECT 'Epic Integration, Hub, and CFSP tables created' AS status;
