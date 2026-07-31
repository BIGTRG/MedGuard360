-- Fraud Detection Engine Tables
-- 10 detection algorithms with risk scoring

CREATE TABLE IF NOT EXISTS fraud_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id VARCHAR(255) NOT NULL UNIQUE,
  claim_id VARCHAR(255) NOT NULL REFERENCES claims(claim_id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  fraud_score INTEGER NOT NULL, -- 0-100
  risk_level VARCHAR(20) NOT NULL, -- low | medium | high | critical
  detected_flags JSONB NOT NULL, -- array of detection flags
  requires_human_review BOOLEAN NOT NULL DEFAULT FALSE,
  recommended_action VARCHAR(30) NOT NULL, -- auto_approve | human_review | auto_hold
  human_review_completed BOOLEAN DEFAULT FALSE,
  human_review_result VARCHAR(20), -- approved | denied | escalated
  human_reviewer_id UUID REFERENCES users(id),
  human_review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for fraud assessment queries
CREATE INDEX idx_fraud_assessment_claim_id ON fraud_assessments(claim_id);
CREATE INDEX idx_fraud_assessment_provider_id ON fraud_assessments(provider_id);
CREATE INDEX idx_fraud_assessment_fraud_score ON fraud_assessments(fraud_score DESC);
CREATE INDEX idx_fraud_assessment_risk_level ON fraud_assessments(risk_level);
CREATE INDEX idx_fraud_assessment_requires_review ON fraud_assessments(requires_human_review);
CREATE INDEX idx_fraud_assessment_created_at ON fraud_assessments(created_at);

-- SSDMF verification cache (Social Security Death Master File)
CREATE TABLE IF NOT EXISTS ssdmf_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ssn VARCHAR(11) NOT NULL UNIQUE,
  is_deceased BOOLEAN NOT NULL,
  death_date DATE,
  last_checked TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ssdmf_ssn ON ssdmf_checks(ssn);
CREATE INDEX idx_ssdmf_is_deceased ON ssdmf_checks(is_deceased);

-- Duplicate billing detection log
CREATE TABLE IF NOT EXISTS duplicate_billing_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  service_date DATE NOT NULL,
  service_code VARCHAR(10) NOT NULL,
  duplicate_count INTEGER NOT NULL,
  flagged_claim_ids JSONB, -- array of duplicate claim IDs
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dup_billing_provider ON duplicate_billing_checks(provider_id);
CREATE INDEX idx_dup_billing_patient ON duplicate_billing_checks(patient_id);

-- Service rates for time inflation detection
CREATE TABLE IF NOT EXISTS service_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code VARCHAR(10) NOT NULL UNIQUE,
  service_description VARCHAR(255),
  standard_rate_per_hour NUMERIC(10, 2) NOT NULL,
  state_code VARCHAR(2),
  effective_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_rates_service_code ON service_rates(service_code);
CREATE INDEX idx_service_rates_state_code ON service_rates(state_code);

-- Bundled services detection
CREATE TABLE IF NOT EXISTS bundled_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_code VARCHAR(10) NOT NULL,
  component_code VARCHAR(10) NOT NULL,
  state_code VARCHAR(2),
  notes TEXT,
  effective_date DATE NOT NULL,
  UNIQUE(parent_code, component_code, state_code)
);

CREATE INDEX idx_bundled_parent_code ON bundled_services(parent_code);
CREATE INDEX idx_bundled_component_code ON bundled_services(component_code);

-- Service modalities for modality fraud detection
CREATE TABLE IF NOT EXISTS service_modalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code VARCHAR(10) NOT NULL UNIQUE,
  modality_type VARCHAR(50) NOT NULL, -- residential | day_program | community_based | etc
  appropriate_diagnoses JSONB, -- array of ICD-10 codes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_modalities_service_code ON service_modalities(service_code);

-- Fraud ring risk scores (from GNN analysis)
CREATE TABLE IF NOT EXISTS fraud_ring_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  ring_score NUMERIC(5, 2) NOT NULL, -- 0-1.0 (from GNN model)
  associated_providers JSONB, -- array of provider IDs in ring
  associated_patients JSONB, -- array of patient IDs in ring
  last_calculated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_ring_provider ON fraud_ring_scores(provider_id);
CREATE INDEX idx_fraud_ring_patient ON fraud_ring_scores(patient_id);
CREATE INDEX idx_fraud_ring_score ON fraud_ring_scores(ring_score DESC);

-- Seed service rates for common NC HCPCS codes
INSERT INTO service_rates (service_code, service_description, standard_rate_per_hour, state_code, effective_date)
VALUES
  ('T1003', 'Community-based residential support', 25.00, 'NC', '2021-07-01'),
  ('T1004', 'Community-based day support', 22.00, 'NC', '2021-07-01'),
  ('T2025', 'Adult day health', 28.00, 'NC', '2021-07-01'),
  ('H2014', 'Psychoeducational service', 18.00, 'NC', '2021-07-01'),
  ('H2018', 'Psychosocial rehabilitation service', 20.00, 'NC', '2021-07-01')
ON CONFLICT (service_code) DO NOTHING;

-- Seed bundled services
INSERT INTO bundled_services (parent_code, component_code, state_code, effective_date)
VALUES
  ('99213', '99214', 'NC', '2021-07-01'), -- Evaluation levels
  ('99232', '99233', 'NC', '2021-07-01')
ON CONFLICT (parent_code, component_code, state_code) DO NOTHING;

SELECT 'Fraud detection tables created' AS status;
