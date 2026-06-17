import { withRlsContext, AuthClaims, NotFoundError } from '@medguard360/shared';
import { GpsPoint } from './geo';

export interface NemtTripRow {
  id: string;
  patient_id: string;
  broker_id: string;
  driver_id: string | null;
  payer_id: string;
  state_code: string;
  hcpcs_code: string;
  trip_type: 'one_way' | 'round_trip' | 'recurring';
  pickup_address: string;
  pickup_latitude: string | null;
  pickup_longitude: string | null;
  destination_address: string;
  destination_latitude: string | null;
  destination_longitude: string | null;
  scheduled_pickup_at: Date;
  actual_pickup_at: Date | null;
  actual_dropoff_at: Date | null;
  miles_billed: string | null;
  total_charge_cents: string | null;
  appointment_id: string | null;
  status: 'scheduled' | 'en_route' | 'completed' | 'no_show' | 'cancelled';
  gps_track: GpsPoint[] | null;
}

export async function createTrip(auth: AuthClaims, input: Partial<NemtTripRow>): Promise<NemtTripRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<NemtTripRow>(
      `INSERT INTO nemt_trips (
         patient_id, broker_id, payer_id, state_code, trip_type,
         pickup_address, pickup_latitude, pickup_longitude,
         destination_address, destination_latitude, destination_longitude,
         scheduled_pickup_at, appointment_id, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [input.patient_id, input.broker_id, input.payer_id, input.state_code, input.trip_type,
       input.pickup_address, input.pickup_latitude ?? null, input.pickup_longitude ?? null,
       input.destination_address, input.destination_latitude ?? null, input.destination_longitude ?? null,
       input.scheduled_pickup_at, input.appointment_id ?? null, auth.sub],
    );
    return r.rows[0];
  });
}

export async function updateTripStatus(auth: AuthClaims, id: string, status: NemtTripRow['status'], driverId?: string): Promise<NemtTripRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<NemtTripRow>(
      `UPDATE nemt_trips
         SET status = $2,
             driver_id = COALESCE($3, driver_id),
             actual_pickup_at  = CASE WHEN $2 = 'en_route'  THEN now() ELSE actual_pickup_at  END,
             actual_dropoff_at = CASE WHEN $2 = 'completed' THEN now() ELSE actual_dropoff_at END
       WHERE id = $1 RETURNING *`,
      [id, status, driverId ?? null],
    );
    if (!r.rows[0]) throw new NotFoundError('NEMT trip');
    return r.rows[0];
  });
}

export async function appendGpsAndBill(auth: AuthClaims, id: string, track: GpsPoint[], miles: number, chargeCents: number): Promise<NemtTripRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<NemtTripRow>(
      `UPDATE nemt_trips
         SET gps_track = $2::jsonb,
             miles_billed = $3,
             total_charge_cents = $4
       WHERE id = $1 RETURNING *`,
      [id, JSON.stringify(track), miles, chargeCents],
    );
    if (!r.rows[0]) throw new NotFoundError('NEMT trip');
    return r.rows[0];
  });
}

export async function listTrips(auth: AuthClaims, limit = 100): Promise<NemtTripRow[]> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<NemtTripRow>(
      `SELECT * FROM nemt_trips ORDER BY scheduled_pickup_at DESC LIMIT $1`,
      [limit],
    );
    return r.rows;
  });
}

export async function getTrip(auth: AuthClaims, id: string): Promise<NemtTripRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<NemtTripRow>('SELECT * FROM nemt_trips WHERE id = $1', [id]);
    if (!r.rows[0]) throw new NotFoundError('NEMT trip');
    return r.rows[0];
  });
}
