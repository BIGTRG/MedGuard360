-- cutover-ga-2026-07-01.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Georgia Medicaid CMO cutover — incumbents OUT, new lineup IN.
-- Effective date: 2026-07-01.
-- Companion to: infrastructure/postgres/migrations/0021_ga_cmo_update.sql
-- See:          integrations/ga-enterprise/PROCUREMENT-STATUS.md (snapshot 2026-05-22)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Background:
--   Migration 0021 staged the cutover by:
--     - setting sunset_date = 2026-06-30 on outgoing CMOs (Amerigroup, Wellpoint,
--       Peach State, Amerigroup GF 360°), keeping them active=TRUE through the
--       bridge period
--     - inserting incoming CMOs (Humana, Molina, UnitedHealthcare, UHC GF 360°)
--       with launch_date = 2026-07-01 and active=FALSE
--
-- This script atomically flips the active flags so that on/after 2026-07-01:
--     - the four outgoing CMOs become inactive (kept in registry for retro 835s
--       and timely-filing appeals — DO NOT DELETE)
--     - the four incoming CMOs become active and routable
--
-- How to run:
--   # On the 2026-07-01 cutover date:
--   docker compose -f docker-compose.yml exec -T postgres \
--     psql -U medguard -d medguard360 < deploy/cutover-ga-2026-07-01.sql
--
--   # Or schedule via cron / Kubernetes CronJob to fire at 00:01 ET on 2026-07-01
--
-- Idempotency: re-running this script is safe. The UPDATEs are predicate-scoped
-- and only flip flags; no inserts. Running before 2026-07-01 is also safe but
-- will deactivate incumbents prematurely — don't.
--
-- Reversibility: a TRO or court injunction could require rollback. To revert,
-- see the matching deploy/cutover-ga-2026-07-01-rollback.sql (or run the inverse
-- UPDATEs by hand — outgoing active=TRUE, incoming active=FALSE).
--
-- Pre-flight checks (read-only) included; the script aborts if the staged rows
-- aren't where they should be.

\set ON_ERROR_STOP on

BEGIN;

-- ── Pre-flight sanity checks ─────────────────────────────────────────────────
-- Confirms migration 0021 ran and the registry is in the expected pre-cutover
-- state. If any of these fail, the cutover is aborted.

DO $$
DECLARE
  outgoing_count    INTEGER;
  incoming_count    INTEGER;
  cutover_date      DATE := DATE '2026-07-01';
  bridge_end_date   DATE := DATE '2026-06-30';
BEGIN
  -- Expect exactly 4 outgoing rows, all active=TRUE, all sunset_date = 2026-06-30
  SELECT COUNT(*) INTO outgoing_count
    FROM mco_registry
   WHERE state_code = 'GA'
     AND mco_tax_id IN ('GA-AMERIGROUP', 'GA-WELLPOINT', 'GA-PEACHSTATE', 'GA-AMERIGROUP-360')
     AND active = TRUE
     AND sunset_date = bridge_end_date;
  IF outgoing_count <> 4 THEN
    RAISE EXCEPTION 'Cutover precondition failed: expected 4 outgoing GA CMOs (active=TRUE, sunset_date=%), found %. Has migration 0021 run? Has the cutover already been executed?', bridge_end_date, outgoing_count;
  END IF;

  -- Expect exactly 4 incoming rows, all active=FALSE, all launch_date = 2026-07-01
  SELECT COUNT(*) INTO incoming_count
    FROM mco_registry
   WHERE state_code = 'GA'
     AND mco_tax_id IN ('GA-HUMANA', 'GA-MOLINA', 'GA-UHC', 'GA-UHC-360')
     AND active = FALSE
     AND launch_date = cutover_date;
  IF incoming_count <> 4 THEN
    RAISE EXCEPTION 'Cutover precondition failed: expected 4 incoming GA CMOs (active=FALSE, launch_date=%), found %. Has migration 0021 run? Has the cutover already been executed?', cutover_date, incoming_count;
  END IF;

  RAISE NOTICE 'Pre-flight passed: % outgoing, % incoming CMOs ready for cutover.', outgoing_count, incoming_count;
END $$;

-- ── Optional date guard ──────────────────────────────────────────────────────
-- Uncomment to refuse to run before 2026-07-01. Commented by default so this
-- file can be unit-tested / dry-run on dev databases.
--
-- DO $$
-- BEGIN
--   IF CURRENT_DATE < DATE '2026-07-01' THEN
--     RAISE EXCEPTION 'Refusing to run cutover before 2026-07-01 (today is %).', CURRENT_DATE;
--   END IF;
-- END $$;

-- ── 1. Deactivate outgoing GA CMOs ──────────────────────────────────────────
-- Rows stay in the registry for retro 835s, corrected claims, and timely-filing
-- appeals. Eligibility and claim routing will skip active=FALSE rows.

UPDATE mco_registry
   SET active = FALSE,
       notes  = notes || ' [Deactivated 2026-07-01 per cutover]'
 WHERE state_code = 'GA'
   AND mco_tax_id IN ('GA-AMERIGROUP', 'GA-WELLPOINT', 'GA-PEACHSTATE', 'GA-AMERIGROUP-360')
   AND active = TRUE;

-- ── 2. Activate incoming GA CMOs ────────────────────────────────────────────
-- These become the live routing targets on/after 2026-07-01.

UPDATE mco_registry
   SET active = TRUE,
       notes  = notes || ' [Activated 2026-07-01 per cutover]'
 WHERE state_code = 'GA'
   AND mco_tax_id IN ('GA-HUMANA', 'GA-MOLINA', 'GA-UHC', 'GA-UHC-360')
   AND active = FALSE;

-- ── 3. Post-cutover sanity ──────────────────────────────────────────────────
DO $$
DECLARE
  outgoing_active   INTEGER;
  incoming_active   INTEGER;
BEGIN
  SELECT COUNT(*) INTO outgoing_active
    FROM mco_registry
   WHERE state_code = 'GA'
     AND mco_tax_id IN ('GA-AMERIGROUP', 'GA-WELLPOINT', 'GA-PEACHSTATE', 'GA-AMERIGROUP-360')
     AND active = TRUE;
  IF outgoing_active <> 0 THEN
    RAISE EXCEPTION 'Post-cutover check failed: % outgoing CMOs still active.', outgoing_active;
  END IF;

  SELECT COUNT(*) INTO incoming_active
    FROM mco_registry
   WHERE state_code = 'GA'
     AND mco_tax_id IN ('GA-HUMANA', 'GA-MOLINA', 'GA-UHC', 'GA-UHC-360')
     AND active = TRUE;
  IF incoming_active <> 4 THEN
    RAISE EXCEPTION 'Post-cutover check failed: expected 4 incoming CMOs active, found %.', incoming_active;
  END IF;

  RAISE NOTICE 'Cutover complete: 0 outgoing active, 4 incoming active.';
END $$;

-- ── 4. Invalidate the state-config cache ────────────────────────────────────
-- The state-config-service caches mco_registry lookups; emit a cache-bust event
-- so the next eligibility/claim request hits the new lineup. (Consumed by
-- state-config-service Kafka consumer; if no consumer is wired, run a manual
-- redis-cli FLUSHDB or call POST /api/v1/state-config/cache/invalidate.)

-- Stub: a real wire-up would use pg_notify or write to an outbox table.
-- INSERT INTO outbox_events (topic, payload) VALUES (
--   'state-config.invalidate',
--   jsonb_build_object('state_code', 'GA', 'reason', 'cmo_cutover_2026_07_01')
-- );

COMMIT;

-- ── Operator next steps (out-of-band) ───────────────────────────────────────
--
-- 1. Restart state-config-service pods OR call:
--      curl -X POST http://state-config-service:3018/api/v1/state-config/cache/invalidate \
--           -H "Authorization: Bearer $ADMIN_TOKEN" \
--           -d '{"state_code":"GA"}'
--
-- 2. Verify in /admin/pilot-states and /admin/nc-enterprise (sibling pages):
--      - Active GA plans should show: CareSource, Humana, Molina, UnitedHealthcare,
--        UHC GF 360°
--      - Sunset plans should show greyed-out: Amerigroup, Wellpoint, Peach State,
--        Amerigroup GF 360°
--
-- 3. Notify NEMT brokers, NCTracks (cross-state), Palmetto JJ, and CGS JC of
--    the new GA CMO payer IDs (already in mco_registry.payer_id):
--      GA_CMO_HUMANA, GA_CMO_MOLINA, GA_CMO_UHC, GA_GF360_UHC
--
-- 4. Monitor remit-callback and 277CA traffic for 90 days post-cutover for
--    late 835s referencing the old payer IDs — they must still resolve via
--    claims-service lookup since outgoing rows remain in the registry.
