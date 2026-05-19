-- clinical-doc-service tables — migration 0008

CREATE TABLE IF NOT EXISTS clinical_encounters (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          uuid NOT NULL,
  provider_id         uuid NOT NULL,
  state_code          varchar(2) NOT NULL,
  encounter_type      text NOT NULL CHECK (encounter_type IN ('office','telehealth','home','school','crisis','emergency')),
  status              text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','transcribing','coded','signed','cancelled')),
  started_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  signed_at           timestamptz,
  signed_by           uuid REFERENCES users(id),
  pa_request_ids      uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  claim_ids           uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS enc_patient_idx  ON clinical_encounters(patient_id);
CREATE INDEX IF NOT EXISTS enc_provider_idx ON clinical_encounters(provider_id);
CREATE INDEX IF NOT EXISTS enc_state_idx    ON clinical_encounters(state_code, status);
CREATE INDEX IF NOT EXISTS enc_started_idx  ON clinical_encounters(started_at DESC);

DROP TRIGGER IF EXISTS enc_set_updated_at ON clinical_encounters;
CREATE TRIGGER enc_set_updated_at BEFORE UPDATE ON clinical_encounters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS clinical_documents (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id        uuid NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  patient_id          uuid NOT NULL,
  doc_type            text NOT NULL CHECK (doc_type IN ('note','audio','video','attachment','transcript')),
  mime_type           text NOT NULL,
  minio_bucket        text NOT NULL,
  minio_object_key    text NOT NULL,
  size_bytes          bigint NOT NULL,
  sha256              text NOT NULL,
  extracted_text      text,                                      -- transcript or OCR result
  -- AI outputs (clinical-nlp)
  entities            jsonb,
  suggested_diagnosis_codes jsonb,
  suggested_procedure_codes jsonb,
  nlp_engine_version  text,
  uploaded_at         timestamptz NOT NULL DEFAULT now(),
  created_by          uuid NOT NULL REFERENCES users(id),
  UNIQUE (minio_bucket, minio_object_key)
);

CREATE INDEX IF NOT EXISTS doc_encounter_idx ON clinical_documents(encounter_id);
CREATE INDEX IF NOT EXISTS doc_patient_idx   ON clinical_documents(patient_id);
CREATE INDEX IF NOT EXISTS doc_type_idx      ON clinical_documents(doc_type);

-- RLS — providers see their own encounters; state-scoped admins see in-state.
ALTER TABLE clinical_encounters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enc_read ON clinical_encounters;
CREATE POLICY enc_read ON clinical_encounters FOR SELECT USING (
  app_role_is_cross_state()
  OR provider_id = app_current_user_id()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','prior_auth_specialist',
                              'billing_manager','compliance_officer','fraud_investigator','qa_auditor')
      AND state_code = app_current_state_code())
  OR (app_current_role() = 'patient' AND patient_id = app_current_user_id())
);
DROP POLICY IF EXISTS enc_write ON clinical_encounters;
CREATE POLICY enc_write ON clinical_encounters FOR ALL USING (
  app_role_is_cross_state()
  OR provider_id = app_current_user_id()
  OR app_current_role() IN ('individual_provider','facility_provider','platform_administrator')
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('individual_provider','facility_provider','platform_administrator')
);

ALTER TABLE clinical_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS doc_all ON clinical_documents;
CREATE POLICY doc_all ON clinical_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM clinical_encounters e WHERE e.id = encounter_id)
) WITH CHECK (true);
