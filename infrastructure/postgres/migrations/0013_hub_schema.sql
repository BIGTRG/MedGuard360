-- hub-service tables — migration 0013

CREATE TABLE IF NOT EXISTS hub_calls (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code         varchar(2) NOT NULL,
  from_number        text NOT NULL,
  caller_user_id     uuid,                          -- known if pre-authenticated via IVR
  started_at         timestamptz NOT NULL DEFAULT now(),
  ended_at           timestamptz,
  duration_seconds   integer,
  ai_handled         boolean NOT NULL DEFAULT FALSE,
  human_handoff      boolean NOT NULL DEFAULT FALSE,
  assigned_agent     uuid REFERENCES users(id),
  outcome            text                         -- 'resolved' | 'escalated' | 'dropped'
);
CREATE INDEX IF NOT EXISTS hub_calls_state_idx ON hub_calls(state_code, started_at DESC);

CREATE TABLE IF NOT EXISTS hub_tickets (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id            uuid REFERENCES hub_calls(id) ON DELETE SET NULL,
  state_code         varchar(2) NOT NULL,
  category           text NOT NULL,                -- 'eligibility','claim_status','provider_lookup','crisis','complaint','other'
  subject            text NOT NULL,
  description        text,
  priority           text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status             text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to        uuid REFERENCES users(id),
  resolution         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS hub_tickets_state_status ON hub_tickets(state_code, status);
CREATE INDEX IF NOT EXISTS hub_tickets_priority ON hub_tickets(priority) WHERE status IN ('open','in_progress');

DROP TRIGGER IF EXISTS hub_tickets_set_updated_at ON hub_tickets;
CREATE TRIGGER hub_tickets_set_updated_at BEFORE UPDATE ON hub_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE hub_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hub_calls_all ON hub_calls;
CREATE POLICY hub_calls_all ON hub_calls FOR ALL USING (
  app_role_is_cross_state()
  OR (state_code = app_current_state_code())
) WITH CHECK (app_role_is_cross_state() OR state_code = app_current_state_code());

DROP POLICY IF EXISTS hub_tickets_all ON hub_tickets;
CREATE POLICY hub_tickets_all ON hub_tickets FOR ALL USING (
  app_role_is_cross_state()
  OR state_code = app_current_state_code()
) WITH CHECK (app_role_is_cross_state() OR state_code = app_current_state_code());
