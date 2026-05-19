-- denial-service tables — migration 0010

CREATE TABLE IF NOT EXISTS denials (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id             uuid NOT NULL UNIQUE,
  state_code           varchar(2) NOT NULL,
  carc_code            text NOT NULL,             -- CARC: 11, 16, 50, 96, 151, 197, 204, 236
  carc_description     text NOT NULL,
  rarc_codes           text[] NOT NULL DEFAULT ARRAY[]::text[],   -- secondary remit codes
  denied_amount_cents  bigint NOT NULL CHECK (denied_amount_cents >= 0),
  remit_received_at    timestamptz NOT NULL DEFAULT now(),
  payer_message        text,
  status               text NOT NULL DEFAULT 'received' CHECK (status IN (
    'received','reviewing','appealing','appeal_won','appeal_lost','write_off','expired'
  )),
  appeal_deadline      timestamptz,                 -- payer-specific; default 90d from remit
  assigned_specialist  uuid REFERENCES users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS denials_state_status_idx ON denials(state_code, status);
CREATE INDEX IF NOT EXISTS denials_deadline_idx ON denials(appeal_deadline) WHERE status IN ('received','reviewing','appealing');

DROP TRIGGER IF EXISTS denials_set_updated_at ON denials;
CREATE TRIGGER denials_set_updated_at BEFORE UPDATE ON denials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS appeals (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  denial_id            uuid NOT NULL REFERENCES denials(id) ON DELETE CASCADE,
  attempt_number       integer NOT NULL DEFAULT 1,
  status               text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','won','lost','withdrawn')),
  drafted_by_ai        boolean NOT NULL DEFAULT FALSE,
  ai_engine_version    text,
  ai_confidence        numeric(4,3),
  subject              text NOT NULL,
  body                 text NOT NULL,
  attachments          text[] NOT NULL DEFAULT ARRAY[]::text[],
  reviewed_by          uuid REFERENCES users(id),
  reviewed_at          timestamptz,
  submitted_at         timestamptz,
  decision_at          timestamptz,
  decision_notes       text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (denial_id, attempt_number)
);
CREATE INDEX IF NOT EXISTS appeals_denial_idx ON appeals(denial_id);

DROP TRIGGER IF EXISTS appeals_set_updated_at ON appeals;
CREATE TRIGGER appeals_set_updated_at BEFORE UPDATE ON appeals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE denials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS denials_read ON denials;
CREATE POLICY denials_read ON denials FOR SELECT USING (
  app_role_is_cross_state()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','billing_manager',
                              'denial_appeals_specialist','compliance_officer')
      AND state_code = app_current_state_code())
);
DROP POLICY IF EXISTS denials_write ON denials;
CREATE POLICY denials_write ON denials FOR ALL USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('denial_appeals_specialist','billing_manager','platform_administrator')
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('denial_appeals_specialist','billing_manager','platform_administrator')
);

ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS appeals_all ON appeals;
CREATE POLICY appeals_all ON appeals FOR ALL USING (
  EXISTS (SELECT 1 FROM denials d WHERE d.id = denial_id)
) WITH CHECK (true);
