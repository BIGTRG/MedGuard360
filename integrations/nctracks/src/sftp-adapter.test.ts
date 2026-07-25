import { loadNctracksConfig } from './config';
import { NctracksSftpAdapter } from './sftp-adapter';
import type { ClaimSubmitRequest, NctracksConfig } from './types';

function sftpConfig(): NctracksConfig {
  return loadNctracksConfig({
    NCTRACKS_MODE: 'sftp',
    NCTRACKS_BATCH_SFTP_HOST: 'sftp.example.com',
    NCTRACKS_BATCH_SFTP_USER: 'user',
    NCTRACKS_SFTP_PRIVATE_KEY: '-----PRIVATE KEY-----',
  });
}

function claimReq(): ClaimSubmitRequest {
  return {
    claimType: 'professional',
    patientControlNumber: 'PCN-123',
    totalCharge: 125,
    subscriberId: 'NCMD00100001',
    serviceDateFrom: '2026-07-24',
    serviceDateTo: '2026-07-24',
    diagnoses: [{ code: 'F41.1', system: 'ICD10CM' }],
    lines: [{
      procedureCode: '99213',
      units: 1,
      charge: 125,
      serviceDate: '2026-07-24',
      diagnosisPointers: [1],
    }],
  };
}

describe('NctracksSftpAdapter', () => {
  it('fails fast when constructed without SFTP credentials', () => {
    const cfg = loadNctracksConfig({});
    expect(() => new NctracksSftpAdapter(cfg)).toThrow(/requires NCTRACKS_BATCH_SFTP_HOST/);
  });

  it('reports SFTP health from configured host', async () => {
    await expect(new NctracksSftpAdapter(sftpConfig()).healthCheck())
      .resolves.toEqual({ realtimeOk: false, sftpOk: true });
  });

  it('blocks realtime operations that require SOAP mode', async () => {
    const adapter = new NctracksSftpAdapter(sftpConfig());

    await expect(adapter.checkEligibility({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-24',
    })).rejects.toThrow(/270\/271 requires SOAP/);
    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-123',
      subscriberId: 'NCMD00100001',
    })).rejects.toThrow(/276\/277 requires SOAP/);
  });

  it('surfaces scaffolded batch transport operations with useful context', async () => {
    const adapter = new NctracksSftpAdapter(sftpConfig());

    await expect(adapter.submitClaim(claimReq()))
      .rejects.toThrow(/SFTP upload to sftp\.example\.com not yet connected/);
    await expect(adapter.submitClaim(claimReq())).rejects.toThrow(/Claim PCN-123 ready for batch/);
    await expect(adapter.retrieveRemittances()).rejects.toThrow(/835 SFTP poll not yet implemented/);
    await expect(adapter.pollAcks()).rejects.toThrow(/999\/277CA SFTP poll not yet implemented/);
  });
});
