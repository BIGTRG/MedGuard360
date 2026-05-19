-- notification-service tables — migration 0012

CREATE TABLE IF NOT EXISTS notifications (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel           text NOT NULL CHECK (channel IN ('email','sms','push')),
  template          text NOT NULL,
  recipient         text NOT NULL,                      -- email, phone, or push token
  recipient_user_id uuid,                               -- if known
  state_code        varchar(2),
  subject           text,
  body              text NOT NULL,
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','suppressed')),
  vendor            text,                               -- 'ses' | 'twilio' | 'fcm'
  vendor_message_id text,
  attempts          integer NOT NULL DEFAULT 0,
  last_error        text,
  enqueued_at       timestamptz NOT NULL DEFAULT now(),
  sent_at           timestamptz,
  correlation_id    uuid
);
CREATE INDEX IF NOT EXISTS notif_status_idx ON notifications(status, enqueued_at);
CREATE INDEX IF NOT EXISTS notif_recipient_idx ON notifications(recipient_user_id) WHERE recipient_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notif_state_idx ON notifications(state_code);
