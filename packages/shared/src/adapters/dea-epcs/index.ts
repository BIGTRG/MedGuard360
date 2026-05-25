/**
 * DEA EPCS (Electronic Prescribing of Controlled Substances) adapter.
 *
 * 21 CFR Part 1311 — requires two-factor auth for any electronic Rx of a
 * controlled substance (Schedule II–V). One factor must be biometric or hardware
 * token; the other must be a passphrase the prescriber knows.
 *
 * Compliance: prescriber registers with a DEA-certified credential service
 * provider (CSP) like Symantec, IdenTrust, Drummond. Each transmission carries
 * a digital signature.
 *
 * MedGuard360 hook point: provider-service biometric flow + this adapter
 * generates the EPCS signature header for surescripts-adapter NewRx calls.
 */

import { getConfigOptional, logger } from '../..';

export interface EpcsSignRequest {
  prescriberDeaNumber: string;
  prescriberNpi: string;
  schedule: 'II' | 'III' | 'IV' | 'V';
  drugNdc: string;
  passphrase: string;          // prescriber's EPCS PIN
  biometricToken: string;      // from biometric service (recent verification)
}

export interface EpcsSignResponse {
  signatureToken: string;       // attaches to Surescripts NewRx message
  signedAt: string;
  expiresAt: string;            // typically 5 minutes
}

export interface DeaEpcsAdapter {
  signRx(req: EpcsSignRequest): Promise<EpcsSignResponse>;
}

class StubDeaEpcs implements DeaEpcsAdapter {
  async signRx(req: EpcsSignRequest): Promise<EpcsSignResponse> {
    logger.info('dea-epcs-stub signing Rx', { dea: req.prescriberDeaNumber.slice(0, 2) + '***', schedule: req.schedule });
    return {
      signatureToken: `epcs-stub-${Buffer.from(req.prescriberDeaNumber + req.drugNdc + Date.now()).toString('base64').slice(0, 32)}`,
      signedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }
}

let _instance: DeaEpcsAdapter | undefined;
export function getDeaEpcsAdapter(): DeaEpcsAdapter {
  if (!_instance) {
    const mode = getConfigOptional('DEA_EPCS_MODE', 'stub');
    if (mode === 'live') throw new Error('DEA_EPCS_MODE=live not yet implemented (requires DEA CSP integration)');
    _instance = new StubDeaEpcs();
  }
  return _instance;
}

export const DEA_EPCS_REQUIRED_ENV = [
  'DEA_EPCS_MODE',
  'DEA_EPCS_CSP_VENDOR',      // symantec | identrust | drummond
  'DEA_EPCS_CSP_API_BASE',
  'DEA_EPCS_CSP_CLIENT_ID',
  'DEA_EPCS_CSP_CLIENT_SECRET',
] as const;
