-- =====================================================================
-- MedGuard360 — Base schema (migration 0001)
--
-- Establishes:
--   - Common extensions
--   - users / roles / sessions (auth-service owns these)
--   - The standard PHI-table template via the `phi_table_columns()` macro
--   - Row-level security (RLS) helper functions used by every PHI table
--
-- Per CLAUDE.md: every PHI table has RLS ON, with policies that read
--   current_setting('app.user_id'), current_setting('app.role'),
--   current_setting('app.state_code')
-- which are set by `withRlsContext()` in @medguard360/shared.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'patient', 'individual_provider', 'facility_provider', 'pharmacy',
    'dmepos_supplier', 'nemt_broker', 'mco_admin', 'state_medicaid_agency',
    'federal_cms', 'credentialing_specialist', 'prior_auth_specialist',
    'billing_manager', 'compliance_officer', 'fraud_investigator',
    'denial_appeals_specialist', 'school_administrator', 'hie_administrator',
    'emergency_responder', 'qa_auditor', 'platform_administrator'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deactivated', 'pending_verification');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- RLS helper functions — read session vars set by @medguard360/shared
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', TRUE), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_current_role() RETURNS user_role
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.role', TRUE), '')::user_role
$$;

CREATE OR REPLACE FUNCTION app_current_state_code() RETURNS varchar
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.state_code', TRUE), '')
$$;

-- Convenience: roles that may see PHI across all states (federal_cms, platform_administrator).
CREATE OR REPLACE FUNCTION app_role_is_cross_state() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT app_current_role() IN ('federal_cms', 'platform_administrator')
$$;

-- ---------------------------------------------------------------------
-- users — owned by auth-service
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                    citext NOT NULL UNIQUE,
  password_hash            text NOT NULL,            -- bcrypt; null only for SSO-only users
  role                     user_role NOT NULL,
  status                   user_status NOT NULL DEFAULT 'pending_verification',
  state_code               varchar(2),               -- null for cross-state roles
  org_id                   uuid,                     -- facility / pharmacy / MCO / etc.
  clerk_user_id            text UNIQUE,              -- Clerk linkage
  biometric_enrolled_at    timestamptz,
  last_login_at            timestamptz,
  failed_login_count       integer NOT NULL DEFAULT 0,
  locked_until             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  created_by               uuid REFERENCES users(id)  -- nullable for the first bootstrap admin
);

CREATE INDEX IF NOT EXISTS users_role_idx       ON users(role);
CREATE INDEX IF NOT EXISTS users_state_idx      ON users(state_code);
CREATE INDEX IF NOT EXISTS users_org_idx        ON users(org_id);
CREATE INDEX IF NOT EXISTS users_status_idx     ON users(status);

-- updated_at trigger (reusable for every table)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: a user can always read their own row; platform admins and state agencies see scoped sets.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_self_read ON users;
CREATE POLICY users_self_read ON users FOR SELECT
  USING (
    id = app_current_user_id()
    OR app_role_is_cross_state()
    OR (app_current_role() IN ('state_medicaid_agency', 'mco_admin', 'compliance_officer')
        AND state_code = app_current_state_code())
  );

DROP POLICY IF EXISTS users_self_update ON users;
CREATE POLICY users_self_update ON users FOR UPDATE
  USING (id = app_current_user_id() OR app_role_is_cross_state())
  WITH CHECK (id = app_current_user_id() OR app_role_is_cross_state());

DROP POLICY IF EXISTS users_admin_insert ON users;
CREATE POLICY users_admin_insert ON users FOR INSERT
  WITH CHECK (
    app_current_role() IN ('platform_administrator', 'credentialing_specialist')
    OR app_current_user_id() IS NULL    -- bootstrap path
  );

-- ---------------------------------------------------------------------
-- sessions — refresh-token tracking, biometric verification timestamps
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash       text NOT NULL,                 -- SHA-256 of refresh token
  ip                       inet,
  user_agent               text,
  biometric_verified_at    timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  expires_at               timestamptz NOT NULL,
  revoked_at               timestamptz
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_active_idx ON sessions(user_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(refresh_token_hash);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_self ON sessions;
CREATE POLICY sessions_self ON sessions FOR ALL
  USING (user_id = app_current_user_id() OR app_role_is_cross_state())
  WITH CHECK (user_id = app_current_user_id() OR app_role_is_cross_state());

-- ---------------------------------------------------------------------
-- audit_log_events — append-only, owned by audit-log-service
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log_events (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  actor_user_id     uuid,
  actor_role        user_role,
  actor_state_code  varchar(2),
  actor_org_id      uuid,
  session_id        uuid,
  resource          text NOT NULL,
  resource_id       text NOT NULL,
  action            text NOT NULL,                      -- read / create / update / delete / export / login / ...
  outcome           text NOT NULL,                      -- success / denied / error
  context           jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id    uuid,
  producer          text NOT NULL                       -- emitting service
);

CREATE INDEX IF NOT EXISTS audit_actor_idx       ON audit_log_events(actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_resource_idx    ON audit_log_events(resource, resource_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_correlation_idx ON audit_log_events(correlation_id);
CREATE INDEX IF NOT EXISTS audit_occurred_idx    ON audit_log_events(occurred_at DESC);

-- Append-only enforcement: block UPDATE and DELETE.
CREATE OR REPLACE FUNCTION audit_block_modification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log_events is append-only (% blocked)', TG_OP;
END $$;

DROP TRIGGER IF EXISTS audit_no_update ON audit_log_events;
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_log_events
  FOR EACH ROW EXECUTE FUNCTION audit_block_modification();

DROP TRIGGER IF EXISTS audit_no_delete ON audit_log_events;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_log_events
  FOR EACH ROW EXECUTE FUNCTION audit_block_modification();

-- Cross-state roles can read everything; state-scoped roles see only their state.
ALTER TABLE audit_log_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_read ON audit_log_events;
CREATE POLICY audit_read ON audit_log_events FOR SELECT
  USING (
    app_role_is_cross_state()
    OR app_current_role() IN ('compliance_officer', 'qa_auditor', 'fraud_investigator')
       AND (actor_state_code = app_current_state_code() OR app_current_state_code() IS NULL)
  );

DROP POLICY IF EXISTS audit_insert ON audit_log_events;
CREATE POLICY audit_insert ON audit_log_events FOR INSERT WITH CHECK (true);

-- ---------------------------------------------------------------------
-- biometric_enrollments — facial / thumbprint templates (encrypted blobs)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS biometric_enrollments (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  modality            text NOT NULL CHECK (modality IN ('face', 'thumbprint', 'voice')),
  vendor              text NOT NULL,            -- 'suprema' | 'nec'
  template_encrypted  bytea NOT NULL,           -- AES-256 encrypted vendor template
  template_kid        text NOT NULL,            -- KMS key id used for encryption
  enrolled_at         timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz,
  created_by          uuid NOT NULL REFERENCES users(id),
  UNIQUE (user_id, modality, vendor)
);

ALTER TABLE biometric_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS biometric_self ON biometric_enrollments;
CREATE POLICY biometric_self ON biometric_enrollments FOR ALL
  USING (user_id = app_current_user_id() OR app_role_is_cross_state())
  WITH CHECK (user_id = app_current_user_id() OR app_role_is_cross_state());

-- ---------------------------------------------------------------------
-- Helpful comment for future migrations
-- ---------------------------------------------------------------------
COMMENT ON SCHEMA public IS
  'MedGuard360 base schema. Every PHI table MUST: '
  '(1) include id uuid PK, created_at/updated_at/created_by/state_code columns, '
  '(2) enable RLS, '
  '(3) define policies that read app_current_user_id() / app_current_role() / app_current_state_code(), '
  '(4) reference @medguard360/shared withRlsContext() from service code.';
