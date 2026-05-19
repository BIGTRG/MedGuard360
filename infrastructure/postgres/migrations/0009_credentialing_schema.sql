-- credentialing-service tables — migration 0009
-- 50-state credentialing with 3–5 day turnaround target.

CREATE TABLE IF NOT EXISTS credentialing_applications (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id              uuid NOT NULL,                          -- → providers
  state_code               varchar(2) NOT NULL,
  mco_id                   uuid,                                   -- if credentialing for an MCO
  application_type         text NOT NULL CHECK (application_type IN ('initial','recredential','add_state','add_mco')),
  status                   text NOT NULL DEFAULT 'received' CHECK (status IN (
    'received','docs_pending','psv_pending','review_pending','approved','denied','withdrawn','expired'
  )),
  assigned_specialist      uuid REFERENCES users(id),
  submitted_at             timestamptz NOT NULL DEFAULT now(),
  target_decision_by       timestamptz NOT NULL,                  -- 5 business days from submitted
  decision_at              timestamptz,
  decision_reason          text,
  created_by               uuid NOT NULL REFERENCES users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cred_apps_provider_idx ON credentialing_applications(provider_id);
CREATE INDEX IF NOT EXISTS cred_apps_state_status ON credentialing_applications(state_code, status);
CREATE INDEX IF NOT EXISTS cred_apps_assigned ON credentialing_applications(assigned_specialist) WHERE status NOT IN ('approved','denied','withdrawn','expired');

DROP TRIGGER IF EXISTS cred_apps_set_updated_at ON credentialing_applications;
CREATE TRIGGER cred_apps_set_updated_at BEFORE UPDATE ON credentialing_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS credentialing_documents (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id           uuid NOT NULL REFERENCES credentialing_applications(id) ON DELETE CASCADE,
  doc_type                 text NOT NULL,                          -- matches ocr-engine DocClass
  mime_type                text NOT NULL,
  minio_bucket             text NOT NULL DEFAULT 'credentialing-docs',
  minio_object_key         text NOT NULL,
  size_bytes               bigint NOT NULL,
  sha256                   text NOT NULL,
  ocr_text                 text,
  ocr_classified_as        text,
  ocr_classification_confidence numeric(4,3),
  extracted_fields         jsonb,                                  -- key/value extracted by ocr-engine
  ocr_engine_version       text,
  uploaded_at              timestamptz NOT NULL DEFAULT now(),
  uploaded_by              uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS cred_docs_app_idx ON credentialing_documents(application_id);

-- Primary Source Verification results (NPI registry, PECOS, LEIE, SAM.gov, state license boards)
CREATE TABLE IF NOT EXISTS psv_checks (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id           uuid NOT NULL REFERENCES credentialing_applications(id) ON DELETE CASCADE,
  source                   text NOT NULL CHECK (source IN ('npi_registry','pecos','leie','sam_gov','state_license_board','dea_registry')),
  status                   text NOT NULL CHECK (status IN ('pending','clear','flagged','error')),
  result_summary           text,
  source_reference         text,                                   -- e.g. PECOS individual id
  raw_response             jsonb,
  checked_at               timestamptz NOT NULL DEFAULT now(),
  expires_at               timestamptz                             -- monitoring re-checks
);

CREATE INDEX IF NOT EXISTS psv_app_idx ON psv_checks(application_id);
CREATE INDEX IF NOT EXISTS psv_status_idx ON psv_checks(status);

-- Final credential records (issued upon approval)
CREATE TABLE IF NOT EXISTS credentials (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id              uuid NOT NULL,
  state_code               varchar(2) NOT NULL,
  mco_id                   uuid,
  application_id           uuid NOT NULL REFERENCES credentialing_applications(id),
  effective_from           date NOT NULL,
  expires_at               date NOT NULL,
  status                   text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','expired','terminated')),
  issued_by                uuid NOT NULL REFERENCES users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, state_code, mco_id)
);
CREATE INDEX IF NOT EXISTS credentials_provider ON credentials(provider_id);
CREATE INDEX IF NOT EXISTS credentials_expiring ON credentials(expires_at) WHERE status = 'active';

DROP TRIGGER IF EXISTS credentials_set_updated_at ON credentials;
CREATE TRIGGER credentials_set_updated_at BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE credentialing_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cred_apps_read ON credentialing_applications;
CREATE POLICY cred_apps_read ON credentialing_applications FOR SELECT USING (
  app_role_is_cross_state()
  OR provider_id = app_current_user_id()                           -- self
  OR (app_current_role() IN ('credentialing_specialist','state_medicaid_agency','mco_admin',
                              'compliance_officer','qa_auditor')
      AND state_code = app_current_state_code())
);
DROP POLICY IF EXISTS cred_apps_write ON credentialing_applications;
CREATE POLICY cred_apps_write ON credentialing_applications FOR ALL USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('credentialing_specialist','platform_administrator')
  OR provider_id = app_current_user_id()
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('credentialing_specialist','platform_administrator')
  OR provider_id = app_current_user_id()
);

ALTER TABLE credentialing_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cred_docs_all ON credentialing_documents;
CREATE POLICY cred_docs_all ON credentialing_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM credentialing_applications a WHERE a.id = application_id)) WITH CHECK (true);

ALTER TABLE psv_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS psv_all ON psv_checks;
CREATE POLICY psv_all ON psv_checks FOR ALL
  USING (EXISTS (SELECT 1 FROM credentialing_applications a WHERE a.id = application_id)) WITH CHECK (true);

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credentials_read ON credentials;
CREATE POLICY credentials_read ON credentials FOR SELECT USING (
  app_role_is_cross_state()
  OR provider_id = app_current_user_id()
  OR (app_current_role() IN ('credentialing_specialist','state_medicaid_agency','mco_admin','compliance_officer')
      AND state_code = app_current_state_code())
);
