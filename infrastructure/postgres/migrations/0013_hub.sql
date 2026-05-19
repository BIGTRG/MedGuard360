BEGIN;
CREATE TABLE hub_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code CHAR(2) NOT NULL,
  caller_type TEXT NOT NULL DEFAULT 'unknown', -- patient | provider | emergency_responder | unknown
  caller_id TEXT,  -- phone number or user ID
  intent TEXT NOT NULL DEFAULT 'unknown', -- eligibility | prior_auth | credentialing | crisis | general | fraud_report
  resolution TEXT, -- resolved | transferred | escalated | callback | abandoned
  channel TEXT NOT NULL DEFAULT 'phone', -- phone | web_chat | sms
  duration_seconds INTEGER,
  recording_path TEXT,
  transcript TEXT,
  ai_classification TEXT,
  ai_confidence NUMERIC(5,4),
  fraud_flag BOOLEAN NOT NULL DEFAULT false,
  crisis_flag BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX hub_calls_state_code_idx ON hub_calls(state_code);
CREATE INDEX hub_calls_intent_idx ON hub_calls(intent);
CREATE INDEX hub_calls_crisis_idx ON hub_calls(crisis_flag) WHERE crisis_flag = true;
COMMIT;
