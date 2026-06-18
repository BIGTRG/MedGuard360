import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth, requireRole, auditLog, emitEvent, ValidationError,
} from '@medguard360/shared';
import * as repo from './repository';
import { GpsPoint, haversineMiles, totalGpsMiles } from './geo';

const ScheduleSchema = z.object({
  patientId: z.string().uuid(),
  brokerId: z.string().uuid(),
  payerId: z.string().min(1),
  stateCode: z.string().length(2),
  tripType: z.enum(['one_way','round_trip','recurring']),
  pickupAddress: z.string().min(1).max(500),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
  destinationAddress: z.string().min(1).max(500),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLng: z.number().min(-180).max(180).optional(),
  scheduledPickupAt: z.string().datetime(),
  appointmentId: z.string().optional(),
});

const GpsPointSchema = z.object({
  lat: z.number(), lng: z.number(), t: z.string().datetime(),
});

const CompleteSchema = z.object({
  driverId: z.string().uuid(),
  track: z.array(GpsPointSchema).min(2),
  ratePerMileCents: z.number().int().positive(),
  baseChargeCents: z.number().int().nonnegative().default(0),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError('Invalid input', r.error.flatten());
  return r.data;
}
const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => { fn(req, res, next).catch(next); };

export const router = Router();

router.post('/nemt/trips',
  requireAuth, requireRole('nemt_broker','individual_provider','facility_provider','platform_administrator'),
  ah(async (req, res) => {
    const input = parse(ScheduleSchema, req.body);
    const trip = await repo.createTrip(req.auth!, {
      patient_id: input.patientId, broker_id: input.brokerId,
      payer_id: input.payerId, state_code: input.stateCode, trip_type: input.tripType,
      pickup_address: input.pickupAddress,
      pickup_latitude: input.pickupLat?.toString() ?? null,
      pickup_longitude: input.pickupLng?.toString() ?? null,
      destination_address: input.destinationAddress,
      destination_latitude: input.destinationLat?.toString() ?? null,
      destination_longitude: input.destinationLng?.toString() ?? null,
      scheduled_pickup_at: new Date(input.scheduledPickupAt),
      appointment_id: input.appointmentId ?? null,
      hcpcs_code: 'A0100',
    });
    await emitEvent('nemt.trip.scheduled', {
      tripId: trip.id, patientId: trip.patient_id, stateCode: trip.state_code,
    }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    await auditLog({
      resource: 'nemt_trip', resourceId: trip.id, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
    });
    res.status(201).json(trip);
  }),
);

router.post('/nemt/trips/:id/start',
  requireAuth, requireRole('nemt_broker','platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const driverId = z.string().uuid().parse(req.body.driverId);
    const trip = await repo.updateTripStatus(req.auth!, id, 'en_route', driverId);
    res.json(trip);
  }),
);

router.post('/nemt/trips/:id/complete',
  requireAuth, requireRole('nemt_broker','platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = parse(CompleteSchema, req.body);

    const trip = await repo.updateTripStatus(req.auth!, id, 'completed', input.driverId);

    // Compute mileage from GPS — anti-fraud signal
    const gpsMiles = totalGpsMiles(input.track as GpsPoint[]);
    const charge = input.baseChargeCents + Math.round(gpsMiles * input.ratePerMileCents);

    // Compare to straight-line if we have pickup/destination
    let straightMiles: number | null = null;
    if (trip.pickup_latitude && trip.pickup_longitude && trip.destination_latitude && trip.destination_longitude) {
      straightMiles = haversineMiles(
        { lat: Number(trip.pickup_latitude),       lng: Number(trip.pickup_longitude) },
        { lat: Number(trip.destination_latitude),  lng: Number(trip.destination_longitude) },
      );
    }
    const inflationRatio = straightMiles ? gpsMiles / Math.max(0.1, straightMiles) : null;

    const updated = await repo.appendGpsAndBill(req.auth!, id, input.track as GpsPoint[], gpsMiles, charge);

    await emitEvent('nemt.trip.completed', {
      tripId: id, gpsMiles, straightMiles, inflationRatio, chargeCents: charge,
    }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });

    await auditLog({
      resource: 'nemt_trip', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { gpsMiles, straightMiles, inflationRatio },
    });

    res.json({ trip: updated, gpsMiles, straightMiles, inflationRatio, chargeCents: charge });
  }),
);

router.get('/nemt/trips', requireAuth, ah(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(1000).optional().parse(req.query.limit);
  const trips = await repo.listTrips(req.auth!, limit ?? 100);
  res.json({ count: trips.length, trips });
}));

router.get('/nemt/trips/:id', requireAuth, ah(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const trip = await repo.getTrip(req.auth!, id);
  res.json(trip);
}));
