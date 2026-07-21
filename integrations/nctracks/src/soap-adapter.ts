import { build270ForNctracks } from './x12/build270';
import { parse271 } from './x12/parse271';
import { buildCoreSoapEnvelope, extractCoreEnvelopePayload } from './transport/coreSoap';
import { postCoreSoap } from './transport/httpsPost';
import type {
  ClaimStatusRequest, ClaimStatusResponse, ClaimSubmitRequest, ClaimSubmitResult,
  EligibilityRequest, EligibilityResponse, NctracksAdapter, NctracksConfig, NctracksMode,
  RemittanceFile, RemittanceQuery,
} from './types';

export class NctracksTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NctracksTransportError';
  }
}

let icnCounter = 1;
function nextIcn(): string { return String(icnCounter++).padStart(9, '0'); }

export class NctracksSoapAdapter implements NctracksAdapter {
  public readonly mode: NctracksMode = 'soap';

  constructor(public readonly config: NctracksConfig) {}

  async checkEligibility(req: EligibilityRequest): Promise<EligibilityResponse> {
    const icn = nextIcn();
    const payloadId = req.traceId ?? `MG360-${icn}`;
    const x12 = build270ForNctracks(req, this.config, icn);
    const envelope = buildCoreSoapEnvelope({
      payloadType: '270',
      payloadId,
      senderId: this.config.identifiers.submitterId,
      receiverId: this.config.identifiers.receiverId,
      x12Payload: x12,
    });
    const responseXml = await postCoreSoap(this.config.realtime.eligibilityUrl, envelope, this.config);
    const raw271 = extractCoreEnvelopePayload(responseXml);
    const parsed = parse271(raw271);
    return {
      status: parsed.aaaCode ? 'error' : (parsed.active ? 'active' : 'inactive'),
      benefitPlan: parsed.planName,
      coverageDetails: parsed.copay !== undefined
        ? [{ serviceTypeCode: '30', coverageLevel: 'IND', copay: parsed.copay, inNetwork: true }]
        : [],
      aaaRejection: parsed.aaaCode ? { code: parsed.aaaCode, followUpAction: 'C' } : undefined,
      raw271,
      traceId: payloadId,
    };
  }

  async submitClaim(_req: ClaimSubmitRequest): Promise<ClaimSubmitResult> {
    throw new NctracksTransportError('837P batch submission requires SFTP — set NCTRACKS_MODE=live or sftp');
  }

  async getClaimStatus(_req: ClaimStatusRequest): Promise<ClaimStatusResponse> {
    throw new NctracksTransportError('276/277 SOAP transport scaffolded — implement after GDIT sandbox URLs confirmed');
  }

  async retrieveRemittances(_q?: RemittanceQuery): Promise<RemittanceFile[]> {
    throw new NctracksTransportError('835 retrieval requires SFTP — set NCTRACKS_MODE=live or sftp');
  }

  async pollAcks(_since?: string): Promise<{ ack999: import('./types').Ack999[]; ack277CA: import('./types').Ack277CA[] }> {
    throw new NctracksTransportError('999/277CA polling requires SFTP — set NCTRACKS_MODE=live or sftp');
  }

  async healthCheck() {
    return { realtimeOk: Boolean(this.config.realtime.eligibilityUrl), sftpOk: false };
  }
}