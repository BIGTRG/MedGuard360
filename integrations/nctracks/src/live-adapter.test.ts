import { loadNctracksConfig } from './config';
import { NctracksLiveAdapter } from './live-adapter';
import type { ClaimSubmitRequest, NctracksConfig } from './types';
import { postCoreSoap } from './transport/httpsPost';

jest.mock('./transport/httpsPost', () => ({
  postCoreSoap: jest.fn(),
}));

const postCoreSoapMock = jest.mocked(postCoreSoap);

function liveConfig(): NctracksConfig {
  return loadNctracksConfig({
    NCTRACKS_MODE: 'live',
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
    NCTRACKS_CLIENT_CERT: 'cert',
    NCTRACKS_CLIENT_KEY: 'key',
    NCTRACKS_BATCH_SFTP_HOST: 'sftp.example.com',
    NCTRACKS_BATCH_SFTP_USER: 'user',
    NCTRACKS_SFTP_PRIVATE_KEY: '-----PRIVATE KEY-----',
  });
}

function claimReq(): ClaimSubmitRequest {
  return {
    claimType: 'professional',
    patientControlNumber: 'PCN-LIVE-1',
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

describe('NctracksLiveAdapter', () => {
  beforeEach(() => {
    postCoreSoapMock.mockReset();
  });

  it('uses SOAP for realtime eligibility checks', async () => {
    postCoreSoapMock.mockResolvedValue('<cor:COREEnvelopePayload>EB*1**30**MEDICAID**0~</cor:COREEnvelopePayload>');
    const adapter = new NctracksLiveAdapter(liveConfig());

    await expect(adapter.checkEligibility({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-24',
      traceId: 'TRACE-LIVE-1',
    })).resolves.toMatchObject({
      status: 'active',
      benefitPlan: 'MEDICAID',
      traceId: 'TRACE-LIVE-1',
    });

    expect(postCoreSoapMock).toHaveBeenCalledTimes(1);
  });

  it('uses SOAP for claim status scaffold and SFTP for batch scaffolds', async () => {
    const adapter = new NctracksLiveAdapter(liveConfig());

    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-LIVE-1',
      subscriberId: 'NCMD00100001',
    })).rejects.toThrow(/276\/277 SOAP transport scaffolded/);
    await expect(adapter.submitClaim(claimReq()))
      .rejects.toThrow(/Claim PCN-LIVE-1 ready for batch/);
    await expect(adapter.retrieveRemittances()).rejects.toThrow(/835 SFTP poll not yet implemented/);
    await expect(adapter.pollAcks('2026-07-01')).rejects.toThrow(/999\/277CA SFTP poll not yet implemented/);
  });

  it('combines SOAP and SFTP health checks', async () => {
    await expect(new NctracksLiveAdapter(liveConfig()).healthCheck())
      .resolves.toEqual({ realtimeOk: true, sftpOk: true });
  });
});
