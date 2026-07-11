import type {
  Ack277CA, Ack999, ClaimStatusRequest, ClaimStatusResponse, ClaimSubmitRequest, ClaimSubmitResult,
  EligibilityRequest, EligibilityResponse, NctracksAdapter, NctracksConfig, NctracksMode,
  RemittanceFile, RemittanceQuery,
} from './types';
import { NctracksTransportError } from './soap-adapter';

export class NctracksSftpAdapter implements NctracksAdapter {
  public readonly mode: NctracksMode = 'sftp';

  constructor(public readonly config: NctracksConfig) {
    if (!config.batch.sftp) {
      throw new Error('NCTRACKS_MODE=sftp requires NCTRACKS_BATCH_SFTP_HOST and credentials');
    }
  }

  async checkEligibility(_req: EligibilityRequest): Promise<EligibilityResponse> {
    throw new NctracksTransportError('270/271 requires SOAP — set NCTRACKS_MODE=live or soap');
  }

  async submitClaim(req: ClaimSubmitRequest): Promise<ClaimSubmitResult> {
    const host = this.config.batch.sftp!.host;
    throw new NctracksTransportError(
      `SFTP upload to ${host} not yet connected — awaiting GDIT sandbox credentials. ` +
      `Claim ${req.patientControlNumber} ready for batch once ssh2 transport lands.`,
    );
  }

  async getClaimStatus(_req: ClaimStatusRequest): Promise<ClaimStatusResponse> {
    throw new NctracksTransportError('276/277 requires SOAP — set NCTRACKS_MODE=live or soap');
  }

  async retrieveRemittances(_q?: RemittanceQuery): Promise<RemittanceFile[]> {
    throw new NctracksTransportError('835 SFTP poll not yet implemented — awaiting GDIT outbound dir credentials');
  }

  async pollAcks(_since?: string): Promise<{ ack999: Ack999[]; ack277CA: Ack277CA[] }> {
    throw new NctracksTransportError('999/277CA SFTP poll not yet implemented');
  }

  async healthCheck() {
    return { realtimeOk: false, sftpOk: Boolean(this.config.batch.sftp?.host) };
  }
}