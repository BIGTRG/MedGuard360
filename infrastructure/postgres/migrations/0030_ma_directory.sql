-- MA Plan Provider Directory compliance — CMS CY2026 final rule.
-- MA plans must submit provider directory data to CMS and update within
-- 30 days of any change. MCOs annually attest to directory accuracy.

CREATE TABLE IF NOT EXISTS ma_directory_attestations (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mco_payer_id       text NOT NULL,
  state_code         varchar(2) NOT NULL,
  attestation_year   integer NOT NULL,
  attested_by_user_id uuid REFERENCES users(id),
  attested_at        timestamptz,
  accuracy_pct       numeric,                  -- 0..100, attested measured accuracy
  total_providers    integer,
  providers_verified integer,
  providers_unable_to_verify integer,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mco_payer_id, attestation_year)
);

CREATE INDEX IF NOT EXISTS ma_attest_state_idx ON ma_directory_attestations(state_code);

DROP TRIGGER IF EXISTS ma_attest_set_updated_at ON ma_directory_attestations;
CREATE TRIGGER ma_attest_set_updated_at BEFORE UPDATE ON ma_directory_attestations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Change log for 30-day notification window
CREATE TABLE IF NOT EXISTS ma_directory_change_log (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id        uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  change_type        text NOT NULL CHECK (change_type IN (
    'enrollment_status','address','phone','email','accepting_new_patients',
    'specialty','npi','ein','board_certification','language_capability','panel_size'
  )),
  old_value          text,
  new_value          text,
  affected_payer_ids text[] NOT NULL DEFAULT '{}',
  detected_at        timestamptz NOT NULL DEFAULT now(),
  notification_due_at timestamptz NOT NULL,        -- detected_at + 30 days
  notified_payers    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {payerId: notifiedAt}
  notified_complete  boolean NOT NULL DEFAULT FALSE,
  notes              text
);
CREATE INDEX IF NOT EXISTS ma_change_due_idx ON ma_directory_change_log(notification_due_at) WHERE notified_complete = FALSE;

SELECT 'MA directory schema ready' AS status;
