-- =====================================================================
-- state-config-service tables — migration 0002
--
-- Per-state configuration: MMIS connections, MCO registry, payer APIs,
-- prior-auth rules, telehealth policies, filing limits, fraud thresholds.
--
-- These are NOT PHI — they're operational config. We still scope reads:
--  - federal_cms / platform_administrator: see all states
--  - state_medicaid_agency / mco_admin / compliance_officer: own state
--  - other roles: read-only via internal service-to-service calls (no RLS)
-- =====================================================================

CREATE TABLE IF NOT EXISTS state_configs (
  state_code             varchar(2) PRIMARY KEY,
  state_name             text NOT NULL,
  mmis_api_endpoint      text,
  mmis_credential_vault_key text,            -- key name in /opt/credential-vault/, NOT the secret itself
  timely_filing_days     integer NOT NULL DEFAULT 365,
  expedited_pa_hours     integer NOT NULL DEFAULT 72,
  standard_pa_days       integer NOT NULL DEFAULT 7,
  drug_pa_hours          integer NOT NULL DEFAULT 24,
  telehealth_audio_only_allowed boolean NOT NULL DEFAULT TRUE,
  school_based_medicaid_enabled boolean NOT NULL DEFAULT FALSE,
  fraud_score_auto_block_threshold integer NOT NULL DEFAULT 80,   -- 1..100
  fraud_score_review_threshold     integer NOT NULL DEFAULT 30,
  hub_phone_number       text,
  active                 boolean NOT NULL DEFAULT TRUE,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  updated_by             uuid REFERENCES users(id)
);

DROP TRIGGER IF EXISTS state_configs_set_updated_at ON state_configs;
CREATE TRIGGER state_configs_set_updated_at BEFORE UPDATE ON state_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS mco_registry (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code             varchar(2) NOT NULL REFERENCES state_configs(state_code),
  mco_name               text NOT NULL,
  mco_tax_id             text NOT NULL,
  payer_id               text NOT NULL,                          -- 5010 payer id
  credentialing_endpoint text,
  claims_endpoint        text,
  eligibility_endpoint   text,
  pa_endpoint            text,
  contract_start         date,
  contract_end           date,
  active                 boolean NOT NULL DEFAULT TRUE,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state_code, mco_tax_id)
);
CREATE INDEX IF NOT EXISTS mco_registry_state_idx ON mco_registry(state_code) WHERE active;

DROP TRIGGER IF EXISTS mco_registry_set_updated_at ON mco_registry;
CREATE TRIGGER mco_registry_set_updated_at BEFORE UPDATE ON mco_registry
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- PA rules: a denormalized lookup table for "for state X, payer Y, CPT Z, is PA required?"
-- Real coverage criteria live in pa_criteria_documents below.
CREATE TABLE IF NOT EXISTS pa_rules (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code             varchar(2) NOT NULL REFERENCES state_configs(state_code),
  payer_id               text NOT NULL,
  service_code           text NOT NULL,                          -- CPT / HCPCS / NDC
  service_code_type      text NOT NULL CHECK (service_code_type IN ('CPT','HCPCS','NDC','REVENUE')),
  pa_required            boolean NOT NULL,
  expedited_eligible     boolean NOT NULL DEFAULT FALSE,
  criteria_document_id   uuid,                                   -- → pa_criteria_documents.id
  effective_from         date NOT NULL,
  effective_to           date,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state_code, payer_id, service_code, service_code_type, effective_from)
);
CREATE INDEX IF NOT EXISTS pa_rules_lookup_idx
  ON pa_rules(state_code, payer_id, service_code, effective_from DESC);

-- Coverage criteria text — fed to pa-nlp-matcher BERT engine
CREATE TABLE IF NOT EXISTS pa_criteria_documents (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code             varchar(2) NOT NULL REFERENCES state_configs(state_code),
  payer_id               text NOT NULL,
  service_code           text NOT NULL,
  title                  text NOT NULL,
  source                 text NOT NULL,                          -- 'cms_lcd' | 'cms_ncd' | 'mco_policy' | 'state_medicaid'
  source_url             text,
  criteria_text          text NOT NULL,                          -- full prose; the BERT engine embeds this
  embedding_vector_id    text,                                   -- pointer into vector store (qdrant/pgvector)
  effective_from         date NOT NULL,
  effective_to           date,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pa_criteria_lookup_idx
  ON pa_criteria_documents(state_code, payer_id, service_code, effective_from DESC);

-- Seed the phase-1 states (NC, SC, GA) — populated via separate seed script in real deployment
INSERT INTO state_configs (state_code, state_name, hub_phone_number)
VALUES
  ('NC', 'North Carolina', '1-800-NC-MEDCD'),
  ('SC', 'South Carolina', '1-800-SC-MEDCD'),
  ('GA', 'Georgia',        '1-800-GA-MEDCD')
ON CONFLICT (state_code) DO NOTHING;
