-- fraud-engine-service: fraud_cases table
-- NOTE: The comprehensive migration (0006_fraud_schema.sql) is the canonical schema.
-- This file is an idempotent alternative that can be run standalone in environments
-- that have not yet executed 0006_fraud_schema.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS fraud_cases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id              UUID NOT NULL,
  provider_user_id      UUID NOT NULL REFERENCES users(id),
  patient_id            UUID NOT NULL REFERENCES patients(id),
  state_code            CHAR(2) NOT NULL,
  risk_score            INTEGER,
  risk_level            TEXT,
  flags                 TEXT[] DEFAULT '{}',
  recommendation        TEXT,
  ai_explanation        TEXT,
  status                TEXT NOT NULL DEFAULT 'open',
  assigned_to           UUID REFERENCES users(id),
  ai_engine_unavailable BOOLEAN NOT NULL DEFAULT false,
  resolved_at           TIMESTAMPTZ,
  resolution_notes      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fraud_cases_status_idx     ON fraud_cases(status);
CREATE INDEX IF NOT EXISTS fraud_cases_risk_score_idx ON fraud_cases(risk_score DESC);
CREATE INDEX IF NOT EXISTS fraud_cases_state_code_idx ON fraud_cases(state_code);

COMMIT;
