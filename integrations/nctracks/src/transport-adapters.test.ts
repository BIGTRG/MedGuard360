import { createNctracksAdapter } from './index';
import { NctracksLiveAdapter } from './live-adapter';
import { NctracksSftpAdapter } from './sftp-adapter';
import { NctracksTransportError } from './soap-adapter';
import { loadNctracksConfig } from './config';
import type { ClaimSubmitRequest } from './types';

function sftpEnv(mode: 'sftp' | 'live' = 'sftp'): Record<string, string> {
  return {
    NCTRACKS_MODE: mode,
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
    NCTRACKS_CLIENT_CERT: 'cert-pem',
    NCTRACKS_CLIENT_KEY: 'key-pem',
    NCTRACKS_BATCH_SFTP_HOST: 'sftp.example.com',
    NCTRACKS_BATCH_SFTP_USER: 'tp-user',
    NCTRACKS_SFTP_PRIVATE_KEY: 'key-pem',
  };
}

function claimRequest(): ClaimSubmitRequest {
  return {
    claimType: 'professional',
    patientControlNumber: 'PCN-001',
    totalCharge: 100,
    subscriberId: 'NCMD00100001',
    serviceDateFrom: '2026-07-24',
    serviceDateTo: '2026-07-24',
    diagnoses: [{ code: 'Z00.00', system: 'ICD10CM' }],
    lines: [{
      procedureCode: '99213',
      units: 1,
      charge: 100,
      serviceDate: '2026-07-24',
      diagnosisPointers: [1],
    }],
  };
}

describe('NCTracks transport adapter scaffolds', () => {
  it('constructs live mode through the public factory when SOAP and SFTP credentials are present', () => {
    const adapter = createNctracksAdapter({ envSource: sftpEnv('live') });

    expect(adapter).toBeInstanceOf(NctracksLiveAdapter);
    expect(adapter.mode).toBe('live');
  });

  it('reports SFTP readiness from configured batch credentials without attempting network IO', async () => {
    const adapter = new NctracksSftpAdapter(loadNctracksConfig(sftpEnv()));

    await expect(adapter.healthCheck()).resolves.toEqual({ realtimeOk: false, sftpOk: true });
  });

  it('keeps SFTP-only mode from silently handling real-time eligibility or claim status', async () => {
    const adapter = new NctracksSftpAdapter(loadNctracksConfig(sftpEnv()));

    await expect(adapter.checkEligibility({ subscriberId: 'NCMD00100001', dateOfService: '2026-07-24' }))
      .rejects.toThrow(/270\/271 requires SOAP/);
    await expect(adapter.getClaimStatus({ patientControlNumber: 'PCN-001', subscriberId: 'NCMD00100001' }))
      .rejects.toThrow(/276\/277 requires SOAP/);
  });

  it('surfaces patient control number and host when SFTP claim upload is still scaffolded', async () => {
    const adapter = new NctracksSftpAdapter(loadNctracksConfig(sftpEnv()));

    await expect(adapter.submitClaim(claimRequest()))
      .rejects.toThrow('SFTP upload to sftp.example.com not yet connected');
    await expect(adapter.submitClaim(claimRequest()))
      .rejects.toThrow('Claim PCN-001 ready for batch');
  });

  it('combines SOAP and SFTP readiness in live mode health checks', async () => {
    const adapter = new NctracksLiveAdapter(loadNctracksConfig(sftpEnv('live')));

    await expect(adapter.healthCheck()).resolves.toEqual({ realtimeOk: true, sftpOk: true });
  });

  it('delegates live mode batch operations to SFTP transport errors', async () => {
    const adapter = new NctracksLiveAdapter(loadNctracksConfig(sftpEnv('live')));

    await expect(adapter.submitClaim(claimRequest())).rejects.toThrow(NctracksTransportError);
    await expect(adapter.retrieveRemittances()).rejects.toThrow(/835 SFTP poll not yet implemented/);
    await expect(adapter.pollAcks()).rejects.toThrow(/999\/277CA SFTP poll not yet implemented/);
  });
});
