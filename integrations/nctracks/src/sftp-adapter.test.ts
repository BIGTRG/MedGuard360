import { loadNctracksConfig } from './config';
import { NctracksSftpAdapter } from './sftp-adapter';
import { NctracksTransportError } from './soap-adapter';
import type { ClaimSubmitRequest } from './types';

function sftpAdapter(): NctracksSftpAdapter {
  return new NctracksSftpAdapter(loadNctracksConfig({
    NCTRACKS_MODE: 'sftp',
    NCTRACKS_BATCH_SFTP_HOST: 'sftp.example.com',
    NCTRACKS_BATCH_SFTP_USER: 'trading-partner',
    NCTRACKS_SFTP_PRIVATE_KEY: '-----PRIVATE KEY-----',
  }));
}

function claim(): ClaimSubmitRequest {
  return {
    claimType: 'professional',
    patientControlNumber: 'PCN-001',
    totalCharge: 125,
    subscriberId: 'NCMD00100001',
    serviceDateFrom: '2026-07-01',
    serviceDateTo: '2026-07-01',
    diagnoses: [{ code: 'Z00.00', system: 'ICD10CM' }],
    lines: [{
      procedureCode: '99213',
      units: 1,
      charge: 125,
      serviceDate: '2026-07-01',
      diagnosisPointers: [1],
    }],
  };
}

describe('NctracksSftpAdapter', () => {
  it('requires SFTP config at construction time', () => {
    const cfg = loadNctracksConfig({});
    expect(() => new NctracksSftpAdapter(cfg))
      .toThrow(/NCTRACKS_MODE=sftp requires NCTRACKS_BATCH_SFTP_HOST/);
  });

  it('throws a channel-specific error for real-time eligibility', async () => {
    await expect(sftpAdapter().checkEligibility({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-01',
    })).rejects.toThrow(/270\/271 requires SOAP/);
  });

  it('includes SFTP host and claim control number in scaffolded submit errors', async () => {
    await expect(sftpAdapter().submitClaim(claim())).rejects.toThrow(
      /SFTP upload to sftp\.example\.com not yet connected.*Claim PCN-001 ready/s,
    );
  });

  it('throws transport errors for SOAP-only or unimplemented batch poll operations', async () => {
    const adapter = sftpAdapter();

    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-001',
      subscriberId: 'NCMD00100001',
    })).rejects.toThrow(NctracksTransportError);
    await expect(adapter.retrieveRemittances()).rejects.toThrow(/835 SFTP poll not yet implemented/);
    await expect(adapter.pollAcks()).rejects.toThrow(/999\/277CA SFTP poll not yet implemented/);
  });

  it('reports SFTP health from configured host presence', async () => {
    await expect(sftpAdapter().healthCheck()).resolves.toEqual({
      realtimeOk: false,
      sftpOk: true,
    });
  });
});
