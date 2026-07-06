/**
 * @deprecated Use `@medguard360/nctracks` (`createNctracksAdapter`) instead.
 * This legacy shim remains for admin UI catalog references only.
 * Canonical adapter: integrations/nctracks/ (50 unit tests, wired to eligibility + claims).
 *
 * Transports per NCTracks ITF:
 *   - Real-time:  CAQH CORE 2.2.0 SOAP+MIME over mTLS for 270/271, 276/277
 *   - Batch:      SFTP / Connect:Direct (NDM) for 837P/I, 835
 *   - Provider portal: NCID + MFA (manual user flows, not adapter scope)
 *
 * Auth: mutual TLS client certificate + IP allowlisting from NC DHHS.
 * Submitter ID assigned by GDIT EDI Support during onboarding.
 *
 * VENDOR is selected via env: NCTRACKS_MODE = soap | sftp | stub (default).
 */

import { getConfigOptional, logger } from '../..';

export type EligibilityCoverage =
  | 'medicaid'
  | 'medicaid_managed_care'
  | 'medicare'
  | 'dual_eligible'
  | 'family_planning_only'
  | 'none';

export interface EligibilityRequest {
  medicaidId?: string;
  ssn?: string;
  dateOfBirth: string;       // YYYY-MM-DD
  firstName: string;
  lastName: string;
  serviceDate?: string;      // YYYY-MM-DD; defaults to today
  serviceTypeCodes?: string[]; // X12 270 EQ codes; defaults to ['30'] (Health Benefit Plan Coverage)
}

export interface EligibilityResponse {
  coverage: EligibilityCoverage;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  plan?: { payerId: string; name: string; type: 'standard' | 'tailored' | 'foster_care' | 'specialty' | 'cmo' | 'ffs' };
  copayCents?: number;
  deductibleRemainingCents?: number;
  raw271?: string;           // raw X12 271 envelope, for audit
  source: 'nctracks' | 'cache' | 'stub';
  checkedAt: string;         // ISO timestamp
}

export interface ClaimSubmitRequest {
  ediPayload: string;        // pre-generated 837P/I X12 envelope
  claimControlNumber: string;
  payerId: string;
}

export interface ClaimSubmitResponse {
  accepted: boolean;
  acknowledgment999?: string;
  acknowledgment277CA?: string;
  errors?: { code: string; field?: string; message: string }[];
  submittedAt: string;
}

export interface ClaimStatusRequest {
  claimControlNumber: string;
  payerId: string;
  patientMedicaidId: string;
}

export interface ClaimStatusResponse {
  status: 'received' | 'in_process' | 'adjudicated' | 'paid' | 'denied' | 'unknown';
  paidAmountCents?: number;
  remittanceAdviceId?: string;
  raw277?: string;
  checkedAt: string;
}

export interface RemittanceRequest {
  fromDate: string;          // YYYY-MM-DD
  toDate: string;
  payerId?: string;
}

export interface RemittanceResponse {
  files: { fileName: string; sizeBytes: number; raw835: string; checkSum?: string }[];
  fetchedAt: string;
}

export interface NctracksAdapter {
  checkEligibility(req: EligibilityRequest): Promise<EligibilityResponse>;
  submitClaim(req: ClaimSubmitRequest): Promise<ClaimSubmitResponse>;
  getClaimStatus(req: ClaimStatusRequest): Promise<ClaimStatusResponse>;
  fetchRemittance(req: RemittanceRequest): Promise<RemittanceResponse>;
}

// -------------------------------------------------------------------------
// Stub adapter — returns deterministic fake data so dev/demo flows work
// without an NCTracks Trading Partner Agreement.
// -------------------------------------------------------------------------

class StubNctracks implements NctracksAdapter {
  async checkEligibility(req: EligibilityRequest): Promise<EligibilityResponse> {
    logger.info('nctracks-stub eligibility check', { medicaidId: req.medicaidId });
    return {
      coverage: 'medicaid_managed_care',
      active: true,
      effectiveFrom: '2026-01-01',
      plan: { payerId: 'NC_SP_HEALTHYBLUE', name: 'Healthy Blue (Blue Cross NC)', type: 'standard' },
      copayCents: 0,
      source: 'stub',
      checkedAt: new Date().toISOString(),
    };
  }
  async submitClaim(req: ClaimSubmitRequest): Promise<ClaimSubmitResponse> {
    logger.info('nctracks-stub claim submit', { ccn: req.claimControlNumber, bytes: req.ediPayload.length });
    return {
      accepted: true,
      acknowledgment999: `999*1*${req.claimControlNumber}*A`,
      submittedAt: new Date().toISOString(),
    };
  }
  async getClaimStatus(req: ClaimStatusRequest): Promise<ClaimStatusResponse> {
    return { status: 'in_process', checkedAt: new Date().toISOString() };
  }
  async fetchRemittance(req: RemittanceRequest): Promise<RemittanceResponse> {
    return { files: [], fetchedAt: new Date().toISOString() };
  }
}

// -------------------------------------------------------------------------
// Factory
// -------------------------------------------------------------------------

let _instance: NctracksAdapter | undefined;

export function getNctracksAdapter(): NctracksAdapter {
  if (_instance) return _instance;
  const mode = getConfigOptional('NCTRACKS_MODE', 'stub');
  switch (mode) {
    case 'soap':
      throw new Error('NCTRACKS_MODE=soap not yet implemented — see integrations/nctracks/spec.md');
    case 'sftp':
      throw new Error('NCTRACKS_MODE=sftp not yet implemented — see integrations/nctracks/spec.md');
    case 'stub':
    default:
      _instance = new StubNctracks();
  }
  return _instance;
}

/** Required env vars when leaving stub mode (see spec.md): */
export const NCTRACKS_REQUIRED_ENV = [
  'NCTRACKS_MODE',                 // soap | sftp | stub
  'NCTRACKS_SOAP_URL',             // partner-gated URL
  'NCTRACKS_SUBMITTER_ID',         // TSN assigned by GDIT
  'NCTRACKS_TPID',                 // Trading Partner ID
  'NCTRACKS_CLIENT_CERT_PATH',     // PEM cert for mTLS
  'NCTRACKS_CLIENT_KEY_PATH',
  'NCTRACKS_SFTP_HOST',
  'NCTRACKS_SFTP_USER',
  'NCTRACKS_SFTP_KEY_PATH',
] as const;
