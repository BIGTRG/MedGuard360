-- provider-service: providers, provider_specialties, provider_locations
-- NOTE: The comprehensive migration (0007_provider_schema.sql) is the canonical schema
-- with full RLS policies and triggers.  This file is an idempotent CREATE IF NOT EXISTS
-- variant for environments that run migrations without the extended set.

BEGIN;

CREATE TABLE IF NOT EXISTS providers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) UNIQUE,
  npi               TEXT NOT NULL UNIQUE,
  taxonomy_code     TEXT,
  first_name        TEXT,
  last_name         TEXT,
  org_name          TEXT,
  risk_category     TEXT NOT NULL DEFAULT 'limited',       -- limited | moderate | high
  enrollment_status TEXT NOT NULL DEFAULT 'pending',       -- pending | active | suspended | terminated
  state_code        CHAR(2) NOT NULL,
  license_number    TEXT,
  license_state     CHAR(2),
  medicare_enrolled BOOLEAN NOT NULL DEFAULT false,
  medicaid_enrolled BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS providers_npi_idx    ON providers(npi);
CREATE INDEX IF NOT EXISTS providers_state_code_idx ON providers(state_code);
CREATE INDEX IF NOT EXISTS providers_status_idx ON providers(enrollment_status);

CREATE TABLE IF NOT EXISTS provider_specialties (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id          UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  taxonomy_code        TEXT NOT NULL,
  taxonomy_description TEXT,
  is_primary           BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  location_name TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city          TEXT NOT NULL,
  state_code    CHAR(2) NOT NULL,
  zip_code      TEXT NOT NULL,
  phone         TEXT,
  fax           TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  lat           NUMERIC(10, 7),
  lng           NUMERIC(10, 7),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
