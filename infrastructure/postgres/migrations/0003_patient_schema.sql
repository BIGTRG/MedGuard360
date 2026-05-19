-- =====================================================================
-- patient-service tables — migration 0003
-- THE canonical PHI service. Every column except IDs is sensitive.
-- =====================================================================

CREATE TABLE IF NOT EXISTS patients (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Identifiers
  medicaid_id              varchar(32) UNIQUE,                  -- state Medicaid recipient id
  medicare_beneficiary_id  varchar(32) UNIQUE,                  -- MBI
  ssn_last4                varchar(4),                          -- never store full SSN
  -- Demographics (encrypted at rest by Postgres TDE; column-level encryption
  -- can be layered on later for the most sensitive columns)
  first_name               text NOT NULL,
  last_name                text NOT NULL,
  date_of_birth            date NOT NULL,
  sex_at_birth             text CHECK (sex_at_birth IN ('M','F','U')),
  gender_identity          text,
  preferred_language       text,
  -- Contact
  email                    citext,
  phone                    text,
  address_line1            text,
  address_line2            text,
  city                     text,
  state_code               varchar(2) NOT NULL,
  postal_code              varchar(10),
  -- Care
  primary_care_provider_id uuid,                                -- → providers (provider-service)
  crisis_plan_id           uuid,                                -- → crisis_plans (crisis-service)
  -- Lifecycle
  status                   text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deceased')),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  created_by               uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS patients_state_idx ON patients(state_code);
CREATE INDEX IF NOT EXISTS patients_dob_idx ON patients(date_of_birth);
CREATE INDEX IF NOT EXISTS patients_pcp_idx ON patients(primary_care_provider_id);
CREATE INDEX IF NOT EXISTS patients_name_idx ON patients(last_name, first_name);

DROP TRIGGER IF EXISTS patients_set_updated_at ON patients;
CREATE TRIGGER patients_set_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row-level security: this is THE PHI table — get this policy right.
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patients_read ON patients;
CREATE POLICY patients_read ON patients FOR SELECT USING (
  -- Cross-state roles (federal CMS, platform admin) see all
  app_role_is_cross_state()
  -- State-scoped roles see only their state
  OR (
    app_current_role() IN (
      'state_medicaid_agency', 'mco_admin', 'credentialing_specialist',
      'prior_auth_specialist', 'billing_manager', 'compliance_officer',
      'fraud_investigator', 'denial_appeals_specialist', 'qa_auditor',
      'hub_admin'::user_role          -- (omit if role doesn't exist; harmless cast)
    )
    AND state_code = app_current_state_code()
  )
  -- Providers see only their assigned patients
  OR (
    app_current_role() IN ('individual_provider', 'facility_provider')
    AND primary_care_provider_id = app_current_user_id()
  )
  -- Patients see only themselves (joined by users.id; assumes patient.users row links)
  OR (
    app_current_role() = 'patient'
    AND id = app_current_user_id()
  )
  -- Emergency responders see patients in their state when biometric-verified
  -- (the biometric gate is checked at app layer via requireBiometric middleware;
  --  this RLS clause is the second line of defense)
  OR (
    app_current_role() = 'emergency_responder'
    AND state_code = app_current_state_code()
  )
);

DROP POLICY IF EXISTS patients_write ON patients;
CREATE POLICY patients_write ON patients FOR ALL USING (
  app_role_is_cross_state()
  OR (
    app_current_role() IN ('individual_provider', 'facility_provider', 'credentialing_specialist')
    AND state_code = COALESCE(app_current_state_code(), state_code)
  )
) WITH CHECK (
  app_role_is_cross_state()
  OR (
    app_current_role() IN ('individual_provider', 'facility_provider', 'credentialing_specialist')
  )
);

-- Patient → provider assignment history (separate table to keep `patients` thin)
CREATE TABLE IF NOT EXISTS patient_provider_assignments (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_id        uuid NOT NULL,
  relationship       text NOT NULL CHECK (relationship IN ('primary_care','specialist','behavioral_health','dental','vision')),
  state_code         varchar(2) NOT NULL,
  effective_from     date NOT NULL DEFAULT CURRENT_DATE,
  effective_to       date,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS ppa_patient_idx  ON patient_provider_assignments(patient_id);
CREATE INDEX IF NOT EXISTS ppa_provider_idx ON patient_provider_assignments(provider_id);

ALTER TABLE patient_provider_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ppa_read ON patient_provider_assignments;
CREATE POLICY ppa_read ON patient_provider_assignments FOR SELECT USING (
  app_role_is_cross_state()
  OR provider_id = app_current_user_id()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','compliance_officer')
      AND state_code = app_current_state_code())
);
