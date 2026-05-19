export interface NemtTrip {
  id: string;
  patient_id: string;
  broker_user_id: string;
  state_code: string;
  payer_id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  scheduled_date: string; // DATE as ISO string
  actual_pickup_at: string | null;
  actual_dropoff_at: string | null;
  odometer_start: number | null;
  odometer_end: number | null;
  calculated_miles: number | null;
  rate_per_mile: number;
  total_amount: number | null;
  status: NemtTripStatus;
  purpose_code: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type NemtTripStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'billed';

export interface CreateNemtTripInput {
  patient_id: string;
  broker_user_id: string;
  state_code: string;
  payer_id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  scheduled_date: string;
  rate_per_mile?: number;
  purpose_code?: string;
}

export interface NemtTripFilters {
  patientId?: string;
  brokerId?: string;
  stateCode?: string;
  status?: NemtTripStatus;
}

export interface StartTripInput {
  odometerStart?: number;
  lat?: number;
  lng?: number;
}

export interface CompleteTripInput {
  odometerEnd?: number;
  lat?: number;
  lng?: number;
}
