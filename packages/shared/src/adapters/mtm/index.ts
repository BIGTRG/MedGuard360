/**
 * MTM Inc adapter — NEMT broker (NC, multi-state).
 * Spec: integrations/nemt-brokers/README.md
 *
 * MTM Link platform exposes:
 *   - Provider portal (manual)
 *   - REST API for authorized partners (mtmLinkApi)
 *   - HMAC-signed webhooks for trip status events
 *
 * NEMT HCPCS codes: A0080, A0090, A0100, A0110, A0120, A0130, A0140,
 *                   T2002, T2003, T2004, T2005.
 */

import { getConfigOptional, logger } from '../..';

export interface TripAuthRequest {
  memberId: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  destAddress: string;
  destLat?: number;
  destLng?: number;
  scheduledAt: string;       // ISO timestamp
  vehicleClass: 'ambulatory' | 'wheelchair' | 'stretcher' | 'bls' | 'als';
  appointmentReason?: string;
  standingOrderId?: string;
}

export interface TripAuthResponse {
  tripId: string;
  authorizedHcpcs: string;
  mileageEstimate: number;
  expiresAt: string;
  status: 'authorized' | 'denied' | 'pending';
  reason?: string;
}

export interface TripClaimRequest {
  tripId: string;
  hcpcs: string;
  mileageBilled: number;
  pickupAt: string;
  dropoffAt: string;
  gpsTrack?: Array<{ lat: number; lng: number; ts: string }>;
  driverId?: string;
  vehicleId?: string;
}

export interface TripClaimResponse {
  claimId: string;
  acceptedAt: string;
  status: 'accepted' | 'rejected';
  errors?: string[];
}

export interface TripStatusResponse {
  tripId: string;
  status: 'authorized' | 'en_route' | 'arrived' | 'completed' | 'no_show' | 'cancelled';
  driverId?: string;
  updatedAt: string;
}

export interface MtmAdapter {
  authorizeTrip(req: TripAuthRequest): Promise<TripAuthResponse>;
  submitTripClaim(req: TripClaimRequest): Promise<TripClaimResponse>;
  getTripStatus(tripId: string): Promise<TripStatusResponse>;
}

class StubMtm implements MtmAdapter {
  async authorizeTrip(req: TripAuthRequest): Promise<TripAuthResponse> {
    logger.info('mtm-stub authorize trip', { member: req.memberId, dest: req.destAddress });
    return {
      tripId: `mtm-stub-${Date.now()}`,
      authorizedHcpcs: req.vehicleClass === 'wheelchair' ? 'A0130'
                     : req.vehicleClass === 'stretcher'  ? 'A0090'
                     : req.vehicleClass === 'als'        ? 'A0429'
                     : req.vehicleClass === 'bls'        ? 'A0428'
                     : 'A0100',
      mileageEstimate: 12.5,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'authorized',
    };
  }
  async submitTripClaim(req: TripClaimRequest): Promise<TripClaimResponse> {
    logger.info('mtm-stub claim', { trip: req.tripId, miles: req.mileageBilled });
    return { claimId: `mtm-claim-${Date.now()}`, acceptedAt: new Date().toISOString(), status: 'accepted' };
  }
  async getTripStatus(tripId: string): Promise<TripStatusResponse> {
    return { tripId, status: 'completed', updatedAt: new Date().toISOString() };
  }
}

let _instance: MtmAdapter | undefined;
export function getMtmAdapter(): MtmAdapter {
  if (!_instance) {
    const mode = getConfigOptional('MTM_MODE', 'stub');
    if (mode === 'rest') throw new Error('MTM_MODE=rest not yet implemented');
    _instance = new StubMtm();
  }
  return _instance;
}

export const MTM_REQUIRED_ENV = [
  'MTM_MODE',                  // rest | stub
  'MTM_API_BASE',
  'MTM_CLIENT_ID',
  'MTM_CLIENT_SECRET',
  'MTM_WEBHOOK_HMAC_SECRET',
  'MTM_PROVIDER_ID',
] as const;
