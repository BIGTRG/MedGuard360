-- 0024_pa_criterion_overrides.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Two changes to pa_criterion_evaluations:
--
--   1. Sync the canonical schema column names to what the service code has
--      always written/read. Migration 0004 defined columns:
--           status, ai_confidence, evidence_excerpt
--      but services/prior-auth-service has always queried + inserted as:
--           outcome, similarity_score, explanation
--      Result: every PA-creation flow was failing at runtime
--      (same class of bug as the audit-log-service schema drift fixed in
--      0f23f28). Rename the canonical columns to align with the code.
--
--   2. Add columns to persist investigator per-criterion overrides:
--           human_outcome, human_outcome_at, human_reviewer_id
--      The /pa-queue/[id]/evidence page previously kept overrides in
--      component state and tacked them onto resolution notes as plaintext.
--      Now they round-trip through the DB and show on subsequent loads.
--
-- Wired by:
--   - PUT /api/v1/prior-auth/pa-requests/:id/criteria/:cid/override
--   - GET /api/v1/prior-auth/pa-requests/:id returns the new columns inline
--   - Frontend posts each click immediately, refetches the PA detail
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Column renames to match service code ─────────────────────────────────
-- ALTER ... RENAME COLUMN is metadata-only — fast, no table rewrite.

DO $$
BEGIN
  -- Only run renames on first execution. Idempotent on re-run.
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'pa_criterion_evaluations'
                AND column_name = 'status') THEN
    ALTER TABLE pa_criterion_evaluations RENAME COLUMN status           TO outcome;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'pa_criterion_evaluations'
                AND column_name = 'ai_confidence') THEN
    ALTER TABLE pa_criterion_evaluations RENAME COLUMN ai_confidence    TO similarity_score;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'pa_criterion_evaluations'
                AND column_name = 'evidence_excerpt') THEN
    ALTER TABLE pa_criterion_evaluations RENAME COLUMN evidence_excerpt TO explanation;
  END IF;
END $$;

-- Re-add the CHECK constraint under the new column name. The auto-generated
-- constraint name on the original CREATE was tied to `status`; drop it if
-- present and recreate against `outcome`.
ALTER TABLE pa_criterion_evaluations
  DROP CONSTRAINT IF EXISTS pa_criterion_evaluations_status_check;
ALTER TABLE pa_criterion_evaluations
  DROP CONSTRAINT IF EXISTS pa_criterion_evaluations_outcome_check;
ALTER TABLE pa_criterion_evaluations
  ADD CONSTRAINT pa_criterion_evaluations_outcome_check
    CHECK (outcome IN ('met', 'not_met', 'indeterminate'));

-- ── 2. Investigator override columns ────────────────────────────────────────

ALTER TABLE pa_criterion_evaluations
  ADD COLUMN IF NOT EXISTS human_outcome        TEXT,
  ADD COLUMN IF NOT EXISTS human_outcome_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS human_reviewer_id    UUID REFERENCES users(id);

ALTER TABLE pa_criterion_evaluations
  DROP CONSTRAINT IF EXISTS pa_criterion_evaluations_human_outcome_check;
ALTER TABLE pa_criterion_evaluations
  ADD CONSTRAINT pa_criterion_evaluations_human_outcome_check
    CHECK (human_outcome IS NULL OR human_outcome IN ('met', 'not_met', 'indeterminate'));

COMMENT ON COLUMN pa_criterion_evaluations.outcome           IS 'AI-emitted outcome per pa-nlp-matcher: met | not_met | indeterminate.';
COMMENT ON COLUMN pa_criterion_evaluations.similarity_score  IS 'pa-nlp-matcher BERT cosine similarity, 0..1.';
COMMENT ON COLUMN pa_criterion_evaluations.explanation       IS 'AI-generated plain-language rationale (CLAUDE.md AI governance).';
COMMENT ON COLUMN pa_criterion_evaluations.human_outcome     IS 'Investigator-overridden outcome (null = no override yet).';
COMMENT ON COLUMN pa_criterion_evaluations.human_outcome_at  IS 'When the investigator overrode.';
COMMENT ON COLUMN pa_criterion_evaluations.human_reviewer_id IS 'Who overrode.';

COMMIT;
