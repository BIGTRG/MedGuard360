import type {
  ClaimStatusRequest, ClaimStatusResponse, ClaimSubmitRequest, ClaimSubmitResult,
  EligibilityRequest, EligibilityResponse, NctracksAdapter, NctracksConfig, NctracksMode,
  RemittanceFile, RemittanceQuery,
} from './types';
import { NctracksSoapAdapter } from './soap-adapter';
import { NctracksSftpAdapter } from './sftp-adapter';

/** Production adapter: SOAP for real-time, SFTP for batch. */
export class NctracksLiveAdapter implements NctracksAdapter {
  public readonly mode: NctracksMode = 'live';
  private readonly soap: NctracksSoapAdapter;
  private readonly sftp: NctracksSftpAdapter;

  constructor(config: NctracksConfig) {
    this.soap = new NctracksSoapAdapter(config);
    this.sftp = new NctracksSftpAdapter(config);
  }

  checkEligibility(req: EligibilityRequest): Promise<EligibilityResponse> {
    return this.soap.checkEligibility(req);
  }

  submitClaim(req: ClaimSubmitRequest): Promise<ClaimSubmitResult> {
    return this.sftp.submitClaim(req);
  }

  getClaimStatus(req: ClaimStatusRequest): Promise<ClaimStatusResponse> {
    return this.soap.getClaimStatus(req);
  }

  retrieveRemittances(q?: RemittanceQuery): Promise<RemittanceFile[]> {
    return this.sftp.retrieveRemittances(q);
  }

  pollAcks(since?: string) {
    return this.sftp.pollAcks(since);
  }

  async healthCheck() {
    const [rt, sf] = await Promise.all([this.soap.healthCheck(), this.sftp.healthCheck()]);
    return { realtimeOk: rt.realtimeOk, sftpOk: sf.sftpOk };
  }
}