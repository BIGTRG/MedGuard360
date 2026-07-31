-- CMS/Federal Compliance Tables
-- PERM, T-MSIS, HealthConnex, provider screening, EDI audit logs

-- PERM (Payment Error Rate Measurement) Audits
CREATE TABLE IF NOT EXISTS perm_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR(255) NOT NULL UNIQUE,
  state_code VARCHAR(2) NOT NULL,
  sample_year INTEGER NOT NULL,
  claim_count INTEGER NOT NULL,
  selected_claims JSONB, -- Array of claim IDs in sample
  audit_status VARCHAR(30), -- sample_prepared | submitted | completed | error_identified
  error_rate NUMERIC(5, 2), -- CMS-calculated error percentage
  error_amount NUMERIC(15, 2), -- Total error dollars
  corrective_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perm_audit_state ON perm_audits(state_code);
CREATE INDEX idx_perm_audit_year ON perm_audits(sample_year);

-- T-MSIS (Transformed Medicaid Statistical Information System) Exports
CREATE TABLE IF NOT EXISTS tmsis_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id VARCHAR(255) NOT NULL UNIQUE,
  state_code VARCHAR(2) NOT NULL,
  reporting_month DATE NOT NULL,
  record_count INTEGER NOT NULL,
  export_status VARCHAR(20), -- exported | submitted | validated | error
  file_path VARCHAR(255),
  validation_errors TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(state_code, reporting_month)
);

CREATE INDEX idx_tmsis_state ON tmsis_exports(state_code);
CREATE INDEX idx_tmsis_month ON tmsis_exports(reporting_month);

-- HealthConnex (NC HIE) FHIR R4 Synchronization
CREATE TABLE IF NOT EXISTS healthconnex_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  encounter_id VARCHAR(255),
  fhir_bundle_id VARCHAR(255),
  sync_status VARCHAR(20), -- synced | pending | failed | error
  error_message TEXT,
  sync_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_healthconnex_patient ON healthconnex_syncs(patient_id);
CREATE INDEX idx_healthconnex_status ON healthconnex_syncs(sync_status);

-- FHIR R4 Bundle Audit Trail
CREATE TABLE IF NOT EXISTS fhir_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  bundle_content JSONB NOT NULL,
  bundle_entries_count INTEGER,
  hie_destination VARCHAR(50), -- NC HealthConnex, Epic, Cerner, etc.
  submission_status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fhir_bundle_patient ON fhir_bundles(patient_id);

-- Provider Screening (LEIE, PECOS, SAM.gov)
CREATE TABLE IF NOT EXISTS provider_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id VARCHAR(255) NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES providers(id),
  npi VARCHAR(10),
  is_excluded BOOLEAN NOT NULL DEFAULT FALSE,
  excluded_source VARCHAR(50), -- LEIE | PECOS | SAM.gov
  exclusion_reason VARCHAR(255),
  exclusion_effective_date DATE,
  last_screened TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_screening_npi ON provider_screenings(npi);
CREATE INDEX idx_provider_screening_excluded ON provider_screenings(is_excluded);

-- MMIS (Medicaid Management Information System) Provider Enrollment Sync
CREATE TABLE IF NOT EXISTS mmis_provider_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id VARCHAR(255) NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES providers(id),
  npi VARCHAR(10),
  mmis_status VARCHAR(20), -- enrolled | suspended | terminated | pending
  enrollment_date DATE,
  termination_date DATE,
  last_sync_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mmis_sync_provider ON mmis_provider_syncs(provider_id);
CREATE INDEX idx_mmis_sync_status ON mmis_provider_syncs(mmis_status);

-- EDI 270/271 (Eligibility) Transaction Log
CREATE TABLE IF NOT EXISTS edi_270_271_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  service_date DATE,
  edi270_content TEXT NOT NULL, -- EDI 270 payload
  edi271_response JSONB NOT NULL, -- EDI 271 response (parsed)
  eligible BOOLEAN,
  coverage_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_edi_270_271_patient ON edi_270_271_logs(patient_id);
CREATE INDEX idx_edi_270_271_provider ON edi_270_271_logs(provider_id);
CREATE INDEX idx_edi_270_271_eligible ON edi_270_271_logs(eligible);

-- EDI 276/277 (Claim Status) Transaction Log
CREATE TABLE IF NOT EXISTS edi_276_277_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id VARCHAR(255) NOT NULL UNIQUE,
  claim_id VARCHAR(255) NOT NULL,
  edi276_content TEXT NOT NULL,
  edi277_response JSONB NOT NULL,
  claim_status VARCHAR(50), -- pending | paid | denied | rejected
  status_effective_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_edi_276_277_claim ON edi_276_277_logs(claim_id);
CREATE INDEX idx_edi_276_277_status ON edi_276_277_logs(claim_status);

-- Federal Compliance Reports
CREATE TABLE IF NOT EXISTS federal_compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id VARCHAR(255) NOT NULL UNIQUE,
  report_type VARCHAR(50), -- perm | tmsis | denied_claims | exclusion_list
  state_code VARCHAR(2) NOT NULL,
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  total_claims INTEGER,
  error_claims INTEGER,
  error_rate NUMERIC(5, 2),
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(report_type, state_code, reporting_period_start, reporting_period_end)
);

CREATE INDEX idx_federal_report_state ON federal_compliance_reports(state_code);
CREATE INDEX idx_federal_report_type ON federal_compliance_reports(report_type);

-- Provider Data Bank (NPI verification and status)
CREATE TABLE IF NOT EXISTS provider_data_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npi VARCHAR(10) NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES providers(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  middle_name VARCHAR(100),
  credentials VARCHAR(100),
  specialty VARCHAR(100),
  state_licenses JSONB, -- Array of state license records
  board_certifications JSONB,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_data_bank_npi ON provider_data_bank(npi);

-- Audit
SELECT 'CMS compliance tables created' AS status;
