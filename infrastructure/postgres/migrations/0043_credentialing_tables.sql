-- Provider Credentialing System Tables
-- NCTracks, Optum PDM, credential tracking, suspension automation

-- Credentialing Applications
CREATE TABLE IF NOT EXISTS credentialing_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credentialing_id VARCHAR(255) NOT NULL UNIQUE,
  npi VARCHAR(10) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  state_code VARCHAR(2) NOT NULL,
  application_type VARCHAR(20) NOT NULL, -- initial | recredential
  credentialing_system VARCHAR(50) NOT NULL, -- nctracks | optum_pdm
  status VARCHAR(20), -- submitted | in_progress | approved | denied | pending_review
  submission_date TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_completion_date TIMESTAMP WITH TIME ZONE,
  actual_completion_date TIMESTAMP WITH TIME ZONE,
  nctracks_application_id VARCHAR(255),
  optum_application_id VARCHAR(255),
  approval_date DATE,
  denial_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credentialing_app_npi ON credentialing_applications(npi);
CREATE INDEX idx_credentialing_app_status ON credentialing_applications(status);
CREATE INDEX idx_credentialing_app_state ON credentialing_applications(state_code);
CREATE INDEX idx_credentialing_app_type ON credentialing_applications(application_type);

-- Credential Expiration Alerts
CREATE TABLE IF NOT EXISTS credential_expiration_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id VARCHAR(255) NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES providers(id),
  npi VARCHAR(10) NOT NULL,
  days_until_expiration INTEGER NOT NULL,
  alert_type VARCHAR(50), -- 30_day_alert | 14_day_alert | 7_day_alert
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_method VARCHAR(50), -- email | sms | both
  recredential_initiated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expiration_alert_provider ON credential_expiration_alerts(provider_id);
CREATE INDEX idx_expiration_alert_days ON credential_expiration_alerts(days_until_expiration);

-- NCTracks Provider Records (North Carolina)
CREATE TABLE IF NOT EXISTS nctracks_provider_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id),
  nctracks_id VARCHAR(50) NOT NULL UNIQUE,
  nctracks_status VARCHAR(50), -- enrolled | suspended | terminated | pending
  last_sftp_sync TIMESTAMP WITH TIME ZONE,
  nctracks_credentialing_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nctracks_provider ON nctracks_provider_records(provider_id);
CREATE INDEX idx_nctracks_status ON nctracks_provider_records(nctracks_status);

-- Optum PDM Provider Records (SC, GA, Other states)
CREATE TABLE IF NOT EXISTS optum_pdm_provider_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id),
  optum_cvo_id VARCHAR(50) NOT NULL UNIQUE,
  pdm_status VARCHAR(50), -- enrolled | suspended | pending | under_review
  cvo_assignment_date DATE,
  last_pdm_sync TIMESTAMP WITH TIME ZONE,
  pdm_credentialing_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_optum_pdm_provider ON optum_pdm_provider_records(provider_id);
CREATE INDEX idx_optum_pdm_status ON optum_pdm_provider_records(pdm_status);

-- Provider Suspension Automation
CREATE TABLE IF NOT EXISTS provider_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suspension_id VARCHAR(255) NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES providers(id),
  npi VARCHAR(10) NOT NULL,
  suspension_reason VARCHAR(255) NOT NULL, -- credential_expired | exclusion_list | board_action | fraud_investigation
  suspension_effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
  suspension_end_date TIMESTAMP WITH TIME ZONE,
  billing_suspended BOOLEAN DEFAULT FALSE,
  claims_affected_count INTEGER,
  reactivation_date TIMESTAMP WITH TIME ZONE,
  reactivation_approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suspension_provider ON provider_suspensions(provider_id);
CREATE INDEX idx_suspension_reason ON provider_suspensions(suspension_reason);
CREATE INDEX idx_suspension_billing_suspended ON provider_suspensions(billing_suspended);

-- Credential Verification Audit Trail
CREATE TABLE IF NOT EXISTS credential_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id),
  npi VARCHAR(10),
  verification_type VARCHAR(50), -- board_license | dea | state_license | cpn
  verification_date DATE NOT NULL,
  verification_status VARCHAR(20), -- verified | expired | revoked | unknown
  verification_source VARCHAR(100), -- medical board URL, state licensing board, etc.
  next_verification_due DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credential_verification_provider ON credential_verification_log(provider_id);
CREATE INDEX idx_credential_verification_type ON credential_verification_log(verification_type);

-- Re-credentialing Workflow Tracking
CREATE TABLE IF NOT EXISTS recredentialing_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id VARCHAR(255) NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES providers(id),
  npi VARCHAR(10),
  current_credential_expiration_date DATE NOT NULL,
  recredentialing_initiated_date TIMESTAMP WITH TIME ZONE NOT NULL,
  recredentialing_deadline DATE NOT NULL, -- 60-90 days before expiration
  status VARCHAR(20), -- pending | submitted | approved | expired_not_completed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recredentialing_provider ON recredentialing_workflows(provider_id);
CREATE INDEX idx_recredentialing_status ON recredentialing_workflows(status);

-- Credentialing Monitoring Dashboard KPIs
CREATE TABLE IF NOT EXISTS credentialing_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_date DATE NOT NULL,
  state_code VARCHAR(2),
  total_providers INTEGER,
  active_credentials INTEGER,
  expiring_within_30_days INTEGER,
  expired_credentials INTEGER,
  average_days_to_credential NUMERIC(5, 1),
  sla_met_percentage NUMERIC(5, 2), -- % within 5-day SLA
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(measurement_date, state_code)
);

-- Audit
SELECT 'Credentialing tables created' AS status;
