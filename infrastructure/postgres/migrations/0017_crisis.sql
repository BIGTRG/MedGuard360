BEGIN;
CREATE TABLE crisis_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  triggered_by UUID NOT NULL REFERENCES users(id),
  state_code CHAR(2) NOT NULL,
  alert_type TEXT NOT NULL, -- behavioral | medical | psychiatric | substance_use
  severity TEXT NOT NULL DEFAULT 'high', -- medium | high | critical
  description TEXT,
  crisis_plan_id UUID,
  location_lat NUMERIC(10,7),
  location_lng NUMERIC(10,7),
  status TEXT NOT NULL DEFAULT 'active', -- active | responding | resolved | false_alarm
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX crisis_alerts_patient_idx ON crisis_alerts(patient_id);
CREATE INDEX crisis_alerts_status_idx ON crisis_alerts(status);
CREATE INDEX crisis_alerts_active_idx ON crisis_alerts(status) WHERE status = 'active';
COMMIT;
