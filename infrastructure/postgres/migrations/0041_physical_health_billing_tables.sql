-- Physical Health Billing System Tables
-- DRG, FQHC, RUG, negotiated rates, and ED No Surprises Act tracking

-- DRG (Diagnosis-Related Group) Assignments
CREATE TABLE IF NOT EXISTS drg_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drg_code VARCHAR(10) NOT NULL UNIQUE,
  drg_description VARCHAR(500),
  principal_icd10 VARCHAR(10) NOT NULL,
  secondary_icd10_list TEXT[], -- Array of secondary diagnoses
  drg_weight NUMERIC(10, 4) NOT NULL, -- Multiplier for base rate
  average_los NUMERIC(5, 1), -- Average length of stay (in days)
  outlier_threshold_los INTEGER, -- Days beyond which outlier payment applies
  effective_date DATE NOT NULL,
  state_code VARCHAR(2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drg_code ON drg_assignments(drg_code);
CREATE INDEX idx_drg_principal_icd10 ON drg_assignments(principal_icd10);

-- FQHC (Federally Qualified Health Center) PPS Rates
CREATE TABLE IF NOT EXISTS fqhc_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code VARCHAR(2) NOT NULL,
  visit_type VARCHAR(50) NOT NULL, -- initial_comprehensive | established_patient | preventive
  fqhc_pps_rate NUMERIC(10, 2) NOT NULL, -- Per-visit amount
  effective_date DATE NOT NULL,
  UNIQUE(state_code, visit_type)
);

CREATE INDEX idx_fqhc_state ON fqhc_rates(state_code);

-- RUG (Resource Utilization Group) Assignments for SNF
CREATE TABLE IF NOT EXISTS rug_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rug_code VARCHAR(10) NOT NULL UNIQUE,
  mds_level VARCHAR(20) NOT NULL, -- MDS assessment level
  daily_rate NUMERIC(10, 2) NOT NULL,
  state_code VARCHAR(2) NOT NULL,
  effective_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rug_code ON rug_assignments(rug_code);
CREATE INDEX idx_rug_mds_level ON rug_assignments(mds_level);

-- Negotiated Rates (in-network vs out-of-network, No Surprises Act)
CREATE TABLE IF NOT EXISTS negotiated_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES providers(id),
  procedure_code VARCHAR(10),
  service_code VARCHAR(20),
  in_network_rate NUMERIC(10, 2) NOT NULL,
  average_rate NUMERIC(10, 2) NOT NULL,
  out_of_network_cap NUMERIC(10, 2), -- 5% variance allowed over in-network
  state_code VARCHAR(2),
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_negotiated_facility ON negotiated_rates(facility_id);
CREATE INDEX idx_negotiated_procedure ON negotiated_rates(procedure_code);

-- ED (Emergency Department) No Surprises Act Tracking
CREATE TABLE IF NOT EXISTS ed_no_surprises_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id VARCHAR(255) NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id),
  facility_id UUID NOT NULL REFERENCES providers(id),
  charged_amount NUMERIC(10, 2) NOT NULL,
  in_network_cap NUMERIC(10, 2) NOT NULL,
  compliant BOOLEAN NOT NULL, -- charges <= cap
  overage_amount NUMERIC(10, 2), -- Amount exceeding cap
  adjustment_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ed_no_surprises_claim ON ed_no_surprises_checks(claim_id);
CREATE INDEX idx_ed_no_surprises_compliant ON ed_no_surprises_checks(compliant);

-- Global Surgical Package Tracking (bundling)
CREATE TABLE IF NOT EXISTS global_surgical_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpt_code VARCHAR(10) NOT NULL UNIQUE,
  procedure_name VARCHAR(255),
  package_days INTEGER, -- 0, 10, or 90 day global period
  included_preop_days INTEGER,
  included_postop_days INTEGER,
  state_code VARCHAR(2),
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_global_package_cpt ON global_surgical_packages(cpt_code);

-- Readmission Tracking (30-day preventable readmissions)
CREATE TABLE IF NOT EXISTS readmission_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initial_claim_id VARCHAR(255),
  readmission_claim_id VARCHAR(255),
  patient_id UUID NOT NULL REFERENCES patients(id),
  initial_discharge_date DATE NOT NULL,
  readmission_date DATE NOT NULL,
  days_until_readmission INTEGER,
  preventable BOOLEAN, -- Manual review flag
  penalty_applied BOOLEAN DEFAULT FALSE,
  penalty_percent NUMERIC(5, 2) DEFAULT 20.0, -- 20% for preventable
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_readmission_patient ON readmission_tracking(patient_id);
CREATE INDEX idx_readmission_preventable ON readmission_tracking(preventable);

-- MDS (Minimum Data Set) Submissions for SNF
CREATE TABLE IF NOT EXISTS mds_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  facility_id UUID NOT NULL REFERENCES providers(id),
  mds_level VARCHAR(20), -- RUG assessment level
  principal_diagnosis VARCHAR(10), -- ICD-10
  secondary_diagnoses TEXT[], -- Array of ICD-10 codes
  cognitive_score INTEGER,
  activities_of_daily_living_score INTEGER,
  submission_date DATE NOT NULL,
  submission_status VARCHAR(20), -- submitted | accepted | rejected | pending_review
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mds_patient ON mds_submissions(patient_id);
CREATE INDEX idx_mds_facility ON mds_submissions(facility_id);
CREATE INDEX idx_mds_status ON mds_submissions(submission_status);

-- Outlier Thresholds and Adjustments
CREATE TABLE IF NOT EXISTS outlier_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id VARCHAR(255) NOT NULL,
  adjustment_type VARCHAR(50), -- long_stay | short_stay | high_cost
  los INTEGER,
  base_drg_amount NUMERIC(10, 2),
  adjustment_amount NUMERIC(10, 2),
  final_amount NUMERIC(10, 2),
  state_code VARCHAR(2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outlier_adjustment_claim ON outlier_adjustments(claim_id);

-- Modifier Application (global surgical package modifiers)
CREATE TABLE IF NOT EXISTS claim_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id VARCHAR(255) NOT NULL,
  cpt_code VARCHAR(10) NOT NULL,
  modifier_code VARCHAR(10) NOT NULL, -- 25, 59, 91, 92, etc.
  reason VARCHAR(255), -- Why modifier applied
  adjustment_percent NUMERIC(5, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claim_modifiers_claim ON claim_modifiers(claim_id);

-- Timely Filing Tracking
CREATE TABLE IF NOT EXISTS timely_filing_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id VARCHAR(255) NOT NULL,
  service_date DATE NOT NULL,
  claim_submission_date DATE NOT NULL,
  deadline_date DATE NOT NULL, -- 12 months standard
  days_to_file INTEGER,
  filed_on_time BOOLEAN,
  mco_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timely_filing_claim ON timely_filing_tracking(claim_id);
CREATE INDEX idx_timely_filing_on_time ON timely_filing_tracking(filed_on_time);

-- Seed DRG assignments for common NC diagnoses
INSERT INTO drg_assignments (drg_code, drg_description, principal_icd10, drg_weight, average_los, outlier_threshold_los, effective_date, state_code)
VALUES
  ('470', 'Major Joint Replacement or Reattachment of Lower Extremity without CC/MCC', 'M16.9', 1.0000, 2.5, 5, '2021-10-01', 'NC'),
  ('291', 'Heart Failure and Shock with MCC', 'I50.9', 1.3500, 5.2, 10, '2021-10-01', 'NC'),
  ('392', 'Esophagitis, Gastroenteritis and Miscellaneous Digestive Disorders with CC', 'K21.9', 0.8200, 3.1, 7, '2021-10-01', 'NC')
ON CONFLICT (drg_code) DO NOTHING;

-- Seed FQHC rates for NC
INSERT INTO fqhc_rates (state_code, visit_type, fqhc_pps_rate, effective_date)
VALUES
  ('NC', 'initial_comprehensive', 125.00, '2021-07-01'),
  ('NC', 'established_patient', 85.00, '2021-07-01'),
  ('NC', 'preventive', 95.00, '2021-07-01')
ON CONFLICT (state_code, visit_type) DO NOTHING;

SELECT 'Physical health billing tables created' AS status;
