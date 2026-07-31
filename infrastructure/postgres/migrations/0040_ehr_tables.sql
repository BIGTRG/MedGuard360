-- Full EHR (Electronic Health Record) System Tables
-- FHIR R4 compliant; includes 42 CFR Part 2 SUD separation

-- Patient Problems (ICD-10 diagnoses)
CREATE TABLE IF NOT EXISTS patient_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  icd10_code VARCHAR(10) NOT NULL, -- e.g., E11.9 (Type 2 diabetes)
  description VARCHAR(500),
  onset_date DATE,
  resolved_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- active | resolved | inactive
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_problems_patient ON patient_problems(patient_id);
CREATE INDEX idx_patient_problems_status ON patient_problems(status);
CREATE INDEX idx_patient_problems_icd10 ON patient_problems(icd10_code);

-- Patient Medications
CREATE TABLE IF NOT EXISTS patient_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  ndc_code VARCHAR(11), -- National Drug Code
  rxnorm_code VARCHAR(20), -- RxNorm code
  medication_name VARCHAR(255) NOT NULL,
  strength VARCHAR(100),
  route VARCHAR(50), -- PO, IV, IM, SC, etc.
  frequency VARCHAR(100), -- e.g., "once daily", "twice daily"
  start_date DATE NOT NULL,
  stop_date DATE,
  prescriber_id UUID REFERENCES providers(id),
  status VARCHAR(20) DEFAULT 'active', -- active | discontinued | suspended
  reason_for_discontinuation VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_medications_patient ON patient_medications(patient_id);
CREATE INDEX idx_patient_medications_status ON patient_medications(status);
CREATE INDEX idx_patient_medications_ndc_code ON patient_medications(ndc_code);

-- Patient Allergies
CREATE TABLE IF NOT EXISTS patient_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allergy_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  substance_name VARCHAR(255) NOT NULL,
  substance_code VARCHAR(50), -- SNOMED CT code
  reaction_type VARCHAR(500), -- e.g., "rash", "anaphylaxis"
  severity VARCHAR(20), -- mild | moderate | severe | unknown
  onset_date DATE,
  documented_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_allergies_patient ON patient_allergies(patient_id);
CREATE INDEX idx_patient_allergies_severity ON patient_allergies(severity);

-- Patient Immunizations
CREATE TABLE IF NOT EXISTS patient_immunizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immunization_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  cpt_code VARCHAR(10) NOT NULL, -- CPT code for vaccine
  vaccine_code VARCHAR(50), -- CVX code
  vaccine_name VARCHAR(255) NOT NULL,
  administration_date DATE NOT NULL,
  site VARCHAR(100), -- Right arm, left arm, etc.
  lot VARCHAR(100),
  manufacturer VARCHAR(255),
  next_due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_immunizations_patient ON patient_immunizations(patient_id);
CREATE INDEX idx_patient_immunizations_vaccine_code ON patient_immunizations(vaccine_code);

-- Patient Vital Signs
CREATE TABLE IF NOT EXISTS patient_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vital_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  systolic INTEGER, -- mmHg
  diastolic INTEGER, -- mmHg
  heart_rate INTEGER, -- bpm
  respiratory_rate INTEGER, -- breaths/min
  temperature NUMERIC(5, 2), -- Fahrenheit
  oxygen_saturation NUMERIC(5, 2), -- percent
  weight NUMERIC(7, 2), -- kg
  height NUMERIC(5, 2), -- cm
  bmi NUMERIC(5, 2), -- Body Mass Index
  measurement_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_vitals_patient ON patient_vitals(patient_id);
CREATE INDEX idx_patient_vitals_measurement_date ON patient_vitals(measurement_date DESC);

-- Patient Clinical Notes (SOAP format, NLP-enhanced)
CREATE TABLE IF NOT EXISTS patient_clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  note_type VARCHAR(50), -- office_visit | phone_call | procedure | consultation
  subjective_notes TEXT, -- Patient complaint, history
  objective_notes TEXT, -- Examination findings, vital signs
  assessment_notes TEXT, -- Clinical assessment, diagnosis
  plan_notes TEXT, -- Treatment plan, medications, referrals
  suggested_codes JSONB, -- AI-suggested ICD-10 and CPT codes
  nlp_confidence NUMERIC(5, 2), -- Confidence score for code suggestions
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_clinical_notes_patient ON patient_clinical_notes(patient_id);
CREATE INDEX idx_patient_clinical_notes_provider ON patient_clinical_notes(provider_id);
CREATE INDEX idx_patient_clinical_notes_created_at ON patient_clinical_notes(created_at DESC);

-- Patient Lab Results
CREATE TABLE IF NOT EXISTS patient_lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  loinc_code VARCHAR(50) NOT NULL, -- Logical Observation Identifiers Names and Codes
  test_name VARCHAR(255) NOT NULL,
  result VARCHAR(500), -- Result value (can be numeric or text)
  units VARCHAR(50),
  reference_range VARCHAR(100), -- e.g., "95-105" or "negative"
  result_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_lab_results_patient ON patient_lab_results(patient_id);
CREATE INDEX idx_patient_lab_results_loinc_code ON patient_lab_results(loinc_code);

-- Patient Care Plans
CREATE TABLE IF NOT EXISTS patient_care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  goal_description TEXT NOT NULL,
  interventions JSONB, -- Array of intervention objects
  frequency VARCHAR(100), -- e.g., "weekly", "bi-weekly"
  target_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- active | completed | discontinued
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_care_plans_patient ON patient_care_plans(patient_id);
CREATE INDEX idx_patient_care_plans_status ON patient_care_plans(status);

-- OASIS-E Home Health Assessment
CREATE TABLE IF NOT EXISTS oasis_e_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  assessment_date DATE NOT NULL,
  -- Key OASIS-E items (simplified; full assessment has 80+ items)
  m1242_frequency_of_shortness_of_breath INTEGER, -- 0-4
  m1400_grooming INTEGER, -- 0-4 (self-care ability)
  m1850_fall_risk_assessment INTEGER, -- 0-2
  m2003_frequency_pain_interference INTEGER, -- 0-4
  m2023_cognitive_functioning INTEGER, -- 0-4
  m2040_when_patient_leaves_home INTEGER, -- 0-3
  m2300_medical_equipment_use JSONB, -- array of equipment codes
  filler_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oasis_assessment_patient ON oasis_e_assessments(patient_id);

-- Behavioral Health Screening (PHQ-9, GAD-7)
CREATE TABLE IF NOT EXISTS behavioral_health_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  screening_type VARCHAR(50), -- phq9 | gad7 | substance_use
  screening_date DATE NOT NULL,
  -- PHQ-9 (Depression screening) — 9 items, 0-3 each
  phq9_score INTEGER,
  phq9_severity VARCHAR(20), -- minimal | mild | moderate | moderately_severe | severe
  -- GAD-7 (Anxiety screening) — 7 items, 0-3 each
  gad7_score INTEGER,
  gad7_severity VARCHAR(20),
  -- Substance use screening
  substance_use_risk VARCHAR(20), -- low | moderate | high
  recommended_referral VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_behavioral_screening_patient ON behavioral_health_screenings(patient_id);

-- 42 CFR Part 2 SUD (Substance Use Disorder) Separation
-- Substance use records are stored separately with strict access controls
CREATE TABLE IF NOT EXISTS sud_protected_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  substance_use_diagnosis VARCHAR(255), -- ICD-10 code for SUD
  treatment_type VARCHAR(100), -- medication_assisted | counseling | inpatient | outpatient
  start_date DATE,
  end_date DATE,
  notes TEXT,
  -- Access audit trail required by 42 CFR Part 2
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Strict RLS policy for SUD records (only authorized providers and patients)
ALTER TABLE sud_protected_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY sud_records_access ON sud_protected_records
  FOR SELECT USING (
    provider_id = current_user_id() OR patient_id = current_user_id() OR
    (current_user_role() = 'compliance_officer')
  );

CREATE INDEX idx_sud_protected_records_patient ON sud_protected_records(patient_id);
CREATE INDEX idx_sud_protected_records_provider ON sud_protected_records(provider_id);

-- SUD access audit log (42 CFR Part 2 compliance)
CREATE TABLE IF NOT EXISTS sud_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id VARCHAR(255) NOT NULL REFERENCES sud_protected_records(record_id),
  accessed_by UUID NOT NULL REFERENCES users(id),
  access_reason VARCHAR(255),
  access_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sud_audit_record ON sud_access_audit(record_id);
CREATE INDEX idx_sud_audit_timestamp ON sud_access_audit(access_timestamp);

-- Audit
SELECT 'EHR tables with 42 CFR Part 2 separation created' AS status;
