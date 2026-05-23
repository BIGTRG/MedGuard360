-- 0022_fraud_case_escalation.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Add escalation fields to fraud_cases so investigators can hand off a case
-- to a state Program Integrity office (OCPI in NC, OIG in GA), the MFCU,
-- or CMS UPIC without resolving the case as cleared/confirmed_fraud.
--
-- Escalation is distinct from resolution:
--   - resolved_at + status='cleared'|'confirmed_fraud' = investigator's final call
--   - escalated_at + escalation_target = "I'm passing this upstream for criminal
--     or civil prosecution; the case stays open in my queue until that's done"
--
-- Wired by:
--   - POST /api/v1/fraud/cases/:id/escalate (fraud-engine-service)
--   - "Escalate to OCPI" button on /fraud/cases/[id] (frontend)
-- Companion: synthesizeTimeline() in frontend renders escalated_at as a timeline event.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE fraud_cases
  ADD COLUMN IF NOT EXISTS escalated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_by      UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS escalation_target TEXT,
  ADD COLUMN IF NOT EXISTS escalation_notes  TEXT;

-- Index used by the OCPI / MFCU handoff dashboard (case list filtered to escalated)
CREATE INDEX IF NOT EXISTS fraud_cases_escalation_idx
  ON fraud_cases (escalation_target, escalated_at DESC)
  WHERE escalated_at IS NOT NULL;

-- Optional check so we don't store free-form garbage; expand the set as new
-- counterparty integrations land.
ALTER TABLE fraud_cases
  DROP CONSTRAINT IF EXISTS fraud_cases_escalation_target_chk;
ALTER TABLE fraud_cases
  ADD CONSTRAINT fraud_cases_escalation_target_chk
    CHECK (escalation_target IS NULL OR escalation_target IN ('OCPI', 'MFCU', 'CMS_UPIC', 'STATE_OIG'));

COMMENT ON COLUMN fraud_cases.escalated_at      IS 'Timestamp investigator escalated the case upstream. Independent of status.';
COMMENT ON COLUMN fraud_cases.escalated_by      IS 'Investigator user_id who initiated the escalation.';
COMMENT ON COLUMN fraud_cases.escalation_target IS 'Where it was sent: OCPI | MFCU | CMS_UPIC | STATE_OIG.';
COMMENT ON COLUMN fraud_cases.escalation_notes  IS 'Investigator notes for the receiving party. Becomes part of the alert payload.';

COMMIT;
