/**
 * ModivCare adapter (formerly LogistiCare) — NEMT broker.
 * Spec: integrations/nemt-brokers/README.md
 *
 * Same domain shape as MTM; separate adapter so brokers can be swapped per plan
 * (e.g., Healthy Blue → MTM, UnitedHealthcare → ModivCare).
 */

import { getConfigOptional, logger } from '../..';
import type {
  TripAuthRequest, TripAuthResponse,
  TripClaimRequest, TripClaimResponse,
  TripStatusResponse, MtmAdapter,
} from '../mtm';

export type ModivcareAdapter = MtmAdapter; // identical surface

class StubModivcare implements ModivcareAdapter {
  async authorizeTrip(req: TripAuthRequest): Promise<TripAuthResponse> {
    logger.info('modivcare-stub authorize trip', { member: req.memberId });
    return {
      tripId: `modivcare-stub-${Date.now()}`,
      authorizedHcpcs: 'A0100',
      mileageEstimate: 10,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'authorized',
    };
  }
  async submitTripClaim(req: TripClaimRequest): Promise<TripClaimResponse> {
    return { claimId: `modivcare-claim-${Date.now()}`, acceptedAt: new Date().toISOString(), status: 'accepted' };
  }
  async getTripStatus(tripId: string): Promise<TripStatusResponse> {
    return { tripId, status: 'completed', updatedAt: new Date().toISOString() };
  }
}

let _instance: ModivcareAdapter | undefined;
export function getModivcareAdapter(): ModivcareAdapter {
  if (!_instance) {
    const mode = getConfigOptional('MODIVCARE_MODE', 'stub');
    if (mode === 'rest') throw new Error('MODIVCARE_MODE=rest not yet implemented');
    _instance = new StubModivcare();
  }
  return _instance;
}

export const MODIVCARE_REQUIRED_ENV = [
  'MODIVCARE_MODE', 'MODIVCARE_API_BASE',
  'MODIVCARE_CLIENT_ID', 'MODIVCARE_CLIENT_SECRET',
  'MODIVCARE_WEBHOOK_HMAC_SECRET',
] as const;
