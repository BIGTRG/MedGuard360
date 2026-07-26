import { loadNctracksConfig } from './config';
import { NctracksLiveAdapter } from './live-adapter';
import { NctracksTransportError } from './soap-adapter';
import { postCoreSoap } from './transport/httpsPost';
import type {
  ClaimSubmitRequest,
  EligibilityRequest,
  NctracksConfig,
} from './types';

jest.mock('./transport/httpsPost', () => ({
  postCoreSoap: jest.fn(),
}));

const mockPostCoreSoap = postCoreSoap as jest.MockedFunction<typeof postCoreSoap>;

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

function eligibilityReq(): EligibilityRequest {
  return {
    subscriberId: 'NCMD00100007',
    dateOfService: '2026-05-22',
    traceId: 'TRACE-LIVE-1',
  };
}

function claimReq(): ClaimSubmitRequest {
  return {
    claimType: 'professional',
    patientControlNumber: 'PCN-LIVE-001',
    totalCharge: 125,
    subscriberId: 'NCMD00100007',
    serviceDateFrom: '2026-05-22',
    serviceDateTo: '2026-05-22',
    diagnoses: [{ code: 'F41.1', system: 'ICD10CM' }],
    lines: [{
      procedureCode: '90834',
      units: 1,
      charge: 125,
      serviceDate: '2026-05-22',
      diagnosisPointers: [1],
    }],
  };
}

describe('NctracksLiveAdapter', () => {
  beforeEach(() => {
    mockPostCoreSoap.mockReset();
  });

  it('reports live mode and combines real-time plus SFTP health', async () => {
    const adapter = new NctracksLiveAdapter(liveConfig());

    await expect(adapter.healthCheck()).resolves.toEqual({
      realtimeOk: true,
      sftpOk: true,
    });
    expect(adapter.mode).toBe('live');
  });

  it('delegates eligibility checks to SOAP and parses the 271 payload', async () => {
    mockPostCoreSoap.mockResolvedValue([
      '<COREEnvelopePayload>',
      'ISA*00*~',
      'EB*1**30**MEDICAID**5~',
      '</COREEnvelopePayload>',
    ].join(''));

    const adapter = new NctracksLiveAdapter(liveConfig());
    const result = await adapter.checkEligibility(eligibilityReq());

    expect(result).toMatchObject({
      status: 'active',
      benefitPlan: 'MEDICAID',
      traceId: 'TRACE-LIVE-1',
    });
    expect(result.coverageDetails).toEqual([{
      serviceTypeCode: '30',
      coverageLevel: 'IND',
      copay: 5,
      inNetwork: true,
    }]);
    expect(mockPostCoreSoap).toHaveBeenCalledTimes(1);
    expect(mockPostCoreSoap.mock.calls[0][0]).toBe('https://edi.example.com/CORE/Eligibility');
    expect(mockPostCoreSoap.mock.calls[0][1]).toContain('<cor:PayloadType>270</cor:PayloadType>');
    expect(mockPostCoreSoap.mock.calls[0][1]).toContain('NCMD00100007');
  });

  it('routes batch claim submission to SFTP rather than the SOAP transport', async () => {
    const adapter = new NctracksLiveAdapter(liveConfig());

    await expect(adapter.submitClaim(claimReq())).rejects.toThrow(NctracksTransportError);
    await expect(adapter.submitClaim(claimReq())).rejects.toThrow(/SFTP upload to sftp\.example\.com/);
    expect(mockPostCoreSoap).not.toHaveBeenCalled();
  });

  it('routes real-time claim status to the SOAP transport boundary', async () => {
    const adapter = new NctracksLiveAdapter(liveConfig());

    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-LIVE-001',
      subscriberId: 'NCMD00100007',
    })).rejects.toThrow(/276\/277 SOAP transport scaffolded/);
    expect(mockPostCoreSoap).not.toHaveBeenCalled();
  });

  it('routes remittance and acknowledgment polling to SFTP', async () => {
    const adapter = new NctracksLiveAdapter(liveConfig());

    await expect(adapter.retrieveRemittances()).rejects.toThrow(/835 SFTP poll not yet implemented/);
    await expect(adapter.pollAcks()).rejects.toThrow(/999\/277CA SFTP poll not yet implemented/);
    expect(mockPostCoreSoap).not.toHaveBeenCalled();
  });
});
