-- =====================================================================
-- prior-auth-service tables — migration 0004
-- =====================================================================

CREATE TABLE IF NOT EXISTS pa_requests (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id               uuid NOT NULL,                       -- → patients (patient-service)
  ordering_provider_id     uuid NOT NULL,                       -- → providers
  payer_id                 text NOT NULL,
  state_code               varchar(2) NOT NULL,
  service_code             text NOT NULL,
  service_code_type        text NOT NULL CHECK (service_code_type IN ('CPT','HCPCS','NDC','REVENUE')),
  service_description      text,
  diagnosis_codes          text[] NOT NULL DEFAULT ARRAY[]::text[],   -- ICD-10
  urgency                  text NOT NULL DEFAULT 'standard' CHECK (urgency IN ('standard','expedited','drug')),
  clinical_doc_id          uuid,                                -- → clinical_documents (clinical-doc-service)
  status                   text NOT NULL DEFAULT 'received' CHECK (status IN (
    'received','evaluating','approved','denied','needs_more_info','withdrawn','expired'
  )),
  decision_explanation     text,                                -- plain-language; required by CLAUDE.md AI governance
  ai_engine_version        text,                                -- which pa-nlp-matcher model produced the score
  ai_match_score           numeric(4,3),                        -- 0.000..1.000
  human_reviewer_id        uuid REFERENCES users(id),           -- humans always decide per AI governance rule
  decision_at              timestamptz,
  due_at                   timestamptz NOT NULL,                -- enforced by SLA timer (see triggers)
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  created_by               uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS pa_status_idx    ON pa_requests(status, due_at);
CREATE INDEX IF NOT EXISTS pa_patient_idx   ON pa_requests(patient_id);
CREATE INDEX IF NOT EXISTS pa_provider_idx  ON pa_requests(ordering_provider_id);
CREATE INDEX IF NOT EXISTS pa_state_idx     ON pa_requests(state_code, status);

DROP TRIGGER IF EXISTS pa_set_updated_at ON pa_requests;
CREATE TRIGGER pa_set_updated_at BEFORE UPDATE ON pa_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Criteria-by-criteria evaluation log: which specific criteria did the AI find
-- met vs. missing? Required for explainability (CLAUDE.md AI governance).
CREATE TABLE IF NOT EXISTS pa_criterion_evaluations (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pa_request_id      uuid NOT NULL REFERENCES pa_requests(id) ON DELETE CASCADE,
  criterion_text     text NOT NULL,                            -- excerpted line from policy doc
  status             text NOT NULL CHECK (status IN ('met','not_met','indeterminate')),
  evidence_excerpt   text,                                     -- snippet from clinical doc
  evidence_doc_id    uuid,                                     -- → clinical_documents
  ai_confidence      numeric(4,3),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pa_crit_eval_idx ON pa_criterion_evaluations(pa_request_id);

-- RLS — same scoping pattern as patients.
ALTER TABLE pa_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pa_read ON pa_requests;
CREATE POLICY pa_read ON pa_requests FOR SELECT USING (
  app_role_is_cross_state()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','prior_auth_specialist',
                              'compliance_officer','fraud_investigator')
      AND state_code = app_current_state_code())
  OR ordering_provider_id = app_current_user_id()
);

DROP POLICY IF EXISTS pa_write ON pa_requests;
CREATE POLICY pa_write ON pa_requests FOR ALL USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('prior_auth_specialist', 'individual_provider', 'facility_provider')
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('prior_auth_specialist', 'individual_provider', 'facility_provider')
);

ALTER TABLE pa_criterion_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pa_crit_all ON pa_criterion_evaluations;
CREATE POLICY pa_crit_all ON pa_criterion_evaluations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM pa_requests p
            WHERE p.id = pa_request_id
              AND (app_role_is_cross_state()
                   OR p.state_code = app_current_state_code()
                   OR p.ordering_provider_id = app_current_user_id()))
  )
  WITH CHECK (true);
