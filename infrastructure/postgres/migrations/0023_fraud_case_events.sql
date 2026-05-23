-- 0023_fraud_case_events.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only event log for fraud_cases. Captures investigator notes and
-- structural transitions (assigned / escalated / resolved) for a persistent
-- timeline rather than synthesizing one from row fields at render time.
--
-- Wired by:
--   - GET  /api/v1/fraud/cases/:id/events  — list events for one case
--   - POST /api/v1/fraud/cases/:id/events  — investigator records a note
--   - fraud-engine-service.repository writes 'assign', 'escalate', 'resolve'
--     rows when those actions fire (so the timeline is complete even without
--     the consumer rehydrating from Kafka)
--
-- Frontend: /fraud/cases/[id] now fetches events and merges them with the
-- synthesized "case opened" event from fraud_cases.created_at.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS fraud_case_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES fraud_cases(id) ON DELETE CASCADE,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id   UUID REFERENCES users(id),
  event_type      TEXT NOT NULL,
  text            TEXT NOT NULL,
  context         JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT fraud_case_events_type_chk CHECK (event_type IN (
    'note',       -- investigator-authored free-text annotation
    'review',     -- investigator opened/viewed the case (light auditing)
    'assign',     -- assigned to an investigator
    'escalate',   -- handed off to OCPI / MFCU / CMS UPIC / state OIG
    'resolve',    -- cleared or confirmed_fraud
    'system'      -- automated platform event (engine flag, scoring rerun)
  ))
);

CREATE INDEX IF NOT EXISTS fraud_case_events_case_idx
  ON fraud_case_events (case_id, occurred_at);

CREATE INDEX IF NOT EXISTS fraud_case_events_actor_idx
  ON fraud_case_events (actor_user_id, occurred_at DESC)
  WHERE actor_user_id IS NOT NULL;

-- Append-only enforcement: block UPDATE and DELETE per HIPAA pattern used by
-- audit_log_events.
CREATE OR REPLACE FUNCTION fraud_case_events_block_modification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'fraud_case_events is append-only (% blocked)', TG_OP;
END $$;

DROP TRIGGER IF EXISTS fraud_case_events_no_update ON fraud_case_events;
CREATE TRIGGER fraud_case_events_no_update BEFORE UPDATE ON fraud_case_events
  FOR EACH ROW EXECUTE FUNCTION fraud_case_events_block_modification();

DROP TRIGGER IF EXISTS fraud_case_events_no_delete ON fraud_case_events;
CREATE TRIGGER fraud_case_events_no_delete BEFORE DELETE ON fraud_case_events
  FOR EACH ROW EXECUTE FUNCTION fraud_case_events_block_modification();

COMMENT ON TABLE  fraud_case_events       IS 'Append-only event log for fraud cases. Investigator notes + structural transitions.';
COMMENT ON COLUMN fraud_case_events.event_type IS 'note | review | assign | escalate | resolve | system';
COMMENT ON COLUMN fraud_case_events.context    IS 'Event-type-specific payload (e.g. {target,target_notes} for escalate, {to_user_id} for assign).';

COMMIT;
