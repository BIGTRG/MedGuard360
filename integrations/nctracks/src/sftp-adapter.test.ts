import { loadNctracksConfig } from './config';
import { NctracksSftpAdapter } from './sftp-adapter';
import type { ClaimSubmitRequest, NctracksConfig } from './types';

function makeSftpConfig(): NctracksConfig {
  return loadNctracksConfig({
    NCTRACKS_MODE: 'sftp',
    NCTRACKS_BATCH_SFTP_HOST: 'sftp.example.com',
    NCTRACKS_BATCH_SFTP_USER: 'user',
    NCTRACKS_SFTP_PRIVATE_KEY: '-----PRIVATE KEY-----',
  });
}

function claimRequest(): ClaimSubmitRequest {
  return {
    claimType: 'professional',
    patientControlNumber: 'PCN-SFTP-001',
    totalCharge: 100,
    subscriberId: 'NCMD00100001',
    serviceDateFrom: '2026-07-21',
    serviceDateTo: '2026-07-21',
    diagnoses: [{ code: 'G44.1', system: 'ICD10CM' }],
    lines: [{
      procedureCode: '99213',
      units: 1,
      charge: 100,
      serviceDate: '2026-07-21',
      diagnosisPointers: [1],
    }],
  };
}

describe('NctracksSftpAdapter', () => {
  it('refuses construction when SFTP credentials are absent', () => {
    const config = loadNctracksConfig({});

    expect(() => new NctracksSftpAdapter(config))
      .toThrow(/requires NCTRACKS_BATCH_SFTP_HOST/);
  });

  it('routes realtime-only operations away from SFTP mode', async () => {
    const adapter = new NctracksSftpAdapter(makeSftpConfig());

    await expect(adapter.checkEligibility({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-21',
    })).rejects.toThrow(/270\/271 requires SOAP/);
    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-SFTP-001',
      subscriberId: 'NCMD00100001',
    })).rejects.toThrow(/276\/277 requires SOAP/);
  });

  it('keeps unconnected batch operations explicit and includes claim context', async () => {
    const adapter = new NctracksSftpAdapter(makeSftpConfig());

    await expect(adapter.submitClaim(claimRequest()))
      .rejects.toThrow(/Claim PCN-SFTP-001 ready for batch/);
    await expect(adapter.retrieveRemittances())
      .rejects.toThrow(/835 SFTP poll not yet implemented/);
    await expect(adapter.pollAcks())
      .rejects.toThrow(/999\/277CA SFTP poll not yet implemented/);
  });

  it('healthCheck reports configured SFTP channel without realtime SOAP', async () => {
    await expect(new NctracksSftpAdapter(makeSftpConfig()).healthCheck())
      .resolves.toEqual({ realtimeOk: false, sftpOk: true });
  });
});
