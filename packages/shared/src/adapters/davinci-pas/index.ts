/**
 * Da Vinci PAS (Prior Authorization Support) adapter — HL7 FHIR R4 IG.
 *
 * Mandated by CMS Interoperability Final Rule (CMS-0057-F) for impacted payers
 * starting Jan 2027. Used to submit PA requests to payers as FHIR Bundle
 * (Claim + ServiceRequest + clinical attachments) and receive ClaimResponse.
 *
 * IG: http://hl7.org/fhir/us/davinci-pas/
 *
 * Companion specs:
 *   - CRD (Coverage Requirements Discovery) — payer asks "is PA needed?"
 *   - DTR (Documentation Templates and Rules) — provider fills payer-supplied
 *           SMART-on-FHIR questionnaire pre-submission
 *   - PAS (this adapter) — submit the bundle
 */

import { getConfigOptional, logger } from '../..';

export interface PasSubmitRequest {
  payerEndpoint: string;        // base FHIR URL of payer
  bundle: unknown;              // FHIR Bundle (Claim + supporting resources)
  correlationId: string;        // platform-side request id
}

export interface PasSubmitResponse {
  claimResponseId?: string;
  outcome: 'approved' | 'denied' | 'pending' | 'partial' | 'error';
  disposition?: string;
  rawBundle?: unknown;
  submittedAt: string;
}

export interface CrdRequest {
  payerEndpoint: string;
  serviceCode: string;
  patientFhirRef: string;       // e.g. "Patient/abc"
  practitionerFhirRef: string;
}

export interface CrdResponse {
  priorAuthRequired: boolean;
  documentationRequired?: string[];
  reasonText?: string;
  rawCards?: unknown;
}

export interface DaVinciPasAdapter {
  crdCheck(req: CrdRequest): Promise<CrdResponse>;
  submitPriorAuth(req: PasSubmitRequest): Promise<PasSubmitResponse>;
}

class StubDaVinciPas implements DaVinciPasAdapter {
  async crdCheck(req: CrdRequest): Promise<CrdResponse> {
    logger.info('davinci-pas-stub CRD check', { service: req.serviceCode });
    // Common high-cost services that typically require PA
    const requires = ['70553', '70554', '74183', 'J0897', 'J3489'].includes(req.serviceCode);
    return {
      priorAuthRequired: requires,
      documentationRequired: requires ? ['recent clinical notes', 'failed conservative therapy'] : [],
      reasonText: requires ? 'Imaging/biologic — payer requires medical necessity documentation.' : 'No PA required for this code.',
    };
  }
  async submitPriorAuth(req: PasSubmitRequest): Promise<PasSubmitResponse> {
    logger.info('davinci-pas-stub PA submit', { corr: req.correlationId });
    return {
      claimResponseId: `cr-stub-${req.correlationId}`,
      outcome: 'pending',
      disposition: 'Submitted to payer; await ClaimResponse.',
      submittedAt: new Date().toISOString(),
    };
  }
}

let _instance: DaVinciPasAdapter | undefined;
export function getDaVinciPasAdapter(): DaVinciPasAdapter {
  if (!_instance) {
    const mode = getConfigOptional('DAVINCI_PAS_MODE', 'stub');
    if (mode === 'fhir') throw new Error('DAVINCI_PAS_MODE=fhir not yet implemented');
    _instance = new StubDaVinciPas();
  }
  return _instance;
}

export const DAVINCI_PAS_REQUIRED_ENV = [
  'DAVINCI_PAS_MODE',          // fhir | stub
  'DAVINCI_PAS_CLIENT_ID',
  'DAVINCI_PAS_CLIENT_CERT_PATH',
  'DAVINCI_PAS_CLIENT_KEY_PATH',
] as const;
