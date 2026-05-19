-- fraud-engine-service tables — migration 0006

CREATE TABLE IF NOT EXISTS fraud_scores (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id              uuid NOT NULL UNIQUE,                  -- one score per claim
  state_code            varchar(2) NOT NULL,
  score                 integer NOT NULL CHECK (score BETWEEN 1 AND 100),
  recommendation        text NOT NULL CHECK (recommendation IN ('auto_pay','route_to_review','auto_block')),
  flags                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation           text NOT NULL,
  engine_version        text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fraud_scores_state_rec ON fraud_scores(state_code, recommendation, created_at DESC);
CREATE INDEX IF NOT EXISTS fraud_scores_score_idx ON fraud_scores(score DESC);

CREATE TABLE IF NOT EXISTS fraud_cases (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id              uuid NOT NULL,
  state_code            varchar(2) NOT NULL,
  status                text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','confirmed_fraud','cleared','closed')),
  opened_at             timestamptz NOT NULL DEFAULT now(),
  assigned_investigator uuid REFERENCES users(id),
  resolution            text,                                  -- plain-language final disposition
  resolved_at           timestamptz,
  resolved_by           uuid REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fraud_cases_state_status ON fraud_cases(state_code, status);
CREATE INDEX IF NOT EXISTS fraud_cases_investigator ON fraud_cases(assigned_investigator);

DROP TRIGGER IF EXISTS fraud_cases_set_updated_at ON fraud_cases;
CREATE TRIGGER fraud_cases_set_updated_at BEFORE UPDATE ON fraud_cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE fraud_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fraud_scores_read ON fraud_scores;
CREATE POLICY fraud_scores_read ON fraud_scores FOR SELECT USING (
  app_role_is_cross_state()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','fraud_investigator',
                              'compliance_officer','billing_manager')
      AND state_code = app_current_state_code())
);
DROP POLICY IF EXISTS fraud_scores_insert ON fraud_scores;
CREATE POLICY fraud_scores_insert ON fraud_scores FOR INSERT WITH CHECK (true);

ALTER TABLE fraud_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fraud_cases_all ON fraud_cases;
CREATE POLICY fraud_cases_all ON fraud_cases FOR ALL USING (
  app_role_is_cross_state()
  OR (app_current_role() IN ('fraud_investigator', 'compliance_officer', 'state_medicaid_agency')
      AND state_code = app_current_state_code())
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('fraud_investigator', 'compliance_officer', 'state_medicaid_agency')
);
