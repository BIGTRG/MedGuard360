BEGIN;
CREATE TABLE nemt_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  broker_user_id UUID NOT NULL REFERENCES users(id),
  state_code CHAR(2) NOT NULL,
  payer_id TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  pickup_lat NUMERIC(10,7),
  pickup_lng NUMERIC(10,7),
  dropoff_lat NUMERIC(10,7),
  dropoff_lng NUMERIC(10,7),
  scheduled_date DATE NOT NULL,
  actual_pickup_at TIMESTAMPTZ,
  actual_dropoff_at TIMESTAMPTZ,
  odometer_start NUMERIC(10,2),
  odometer_end NUMERIC(10,2),
  calculated_miles NUMERIC(10,2),
  rate_per_mile NUMERIC(10,4) DEFAULT 0.655,
  total_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | in_progress | completed | cancelled | billed
  purpose_code TEXT NOT NULL DEFAULT 'medical_appointment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id)
);
CREATE INDEX nemt_trips_patient_idx ON nemt_trips(patient_id);
CREATE INDEX nemt_trips_status_idx ON nemt_trips(status);
COMMIT;
