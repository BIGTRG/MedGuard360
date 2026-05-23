/**
 * CGS Administrators adapter — Medicare DMEPOS MAC Jurisdiction C.
 * Covers NC, SC, GA, FL, TN, AL, AR, CO, LA, MS, NM, OK, TX, PR, VI, VA, WV.
 *
 * Transport: X12 EDI via myCGS (provider portal) or Connect:Direct for high
 * volume submitters.  Real-time eligibility via 270/271 over CAQH CORE.
 */

import { getConfigOptional, logger } from '../..';

export interface CgsClaimSubmitRequest {
  ediPayload: string;
  claimControlNumber: string;
}

export interface CgsClaimSubmitResponse {
  accepted: boolean;
  acknowledgmentId?: string;
  errors?: { code: string; message: string }[];
  submittedAt: string;
}

export interface CgsAdapter {
  submitDmepos(req: CgsClaimSubmitRequest): Promise<CgsClaimSubmitResponse>;
}

class StubCgs implements CgsAdapter {
  async submitDmepos(req: CgsClaimSubmitRequest): Promise<CgsClaimSubmitResponse> {
    logger.info('cgs-stub DMEPOS submit', { ccn: req.claimControlNumber });
    return { accepted: true, acknowledgmentId: `cgs-${req.claimControlNumber}`, submittedAt: new Date().toISOString() };
  }
}

let _instance: CgsAdapter | undefined;
export function getCgsAdapter(): CgsAdapter {
  if (!_instance) {
    const mode = getConfigOptional('CGS_MODE', 'stub');
    if (mode === 'edi') throw new Error('CGS_MODE=edi not yet implemented');
    _instance = new StubCgs();
  }
  return _instance;
}

export const CGS_REQUIRED_ENV = [
  'CGS_MODE', 'CGS_SUBMITTER_ID', 'CGS_SFTP_HOST', 'CGS_SFTP_USER', 'CGS_SFTP_KEY_PATH',
] as const;
