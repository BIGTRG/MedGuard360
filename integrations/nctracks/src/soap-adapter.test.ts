import { loadNctracksConfig } from './config';
import { NctracksSoapAdapter } from './soap-adapter';
import type { ClaimSubmitRequest, NctracksConfig } from './types';
import { postCoreSoap } from './transport/httpsPost';

jest.mock('./transport/httpsPost', () => ({
  postCoreSoap: jest.fn(),
}));

const postCoreSoapMock = jest.mocked(postCoreSoap);

function soapConfig(): NctracksConfig {
  return loadNctracksConfig({
    NCTRACKS_MODE: 'soap',
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
    NCTRACKS_CLIENT_CERT: 'cert',
    NCTRACKS_CLIENT_KEY: 'key',
    NCTRACKS_SUBMITTER_ID: 'SUBMITTER',
    NCTRACKS_RECEIVER_ID: 'NCXIX',
  });
}

function claimReq(): ClaimSubmitRequest {
  return {
    claimType: 'professional',
    patientControlNumber: 'PCN-001',
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

describe('NctracksSoapAdapter', () => {
  beforeEach(() => {
    postCoreSoapMock.mockReset();
  });

  it('maps an active 271 CORE response into the adapter eligibility shape', async () => {
    postCoreSoapMock.mockResolvedValue([
      '<cor:COREEnvelopePayload>',
      'EB*1**30**MEDICAID**7.5~',
      '</cor:COREEnvelopePayload>',
    ].join(''));
    const cfg = soapConfig();
    const adapter = new NctracksSoapAdapter(cfg);

    const response = await adapter.checkEligibility({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-24',
      traceId: 'TRACE-ELIG-1',
    });

    expect(response).toEqual({
      status: 'active',
      benefitPlan: 'MEDICAID',
      coverageDetails: [{
        serviceTypeCode: '30',
        coverageLevel: 'IND',
        copay: 7.5,
        inNetwork: true,
      }],
      aaaRejection: undefined,
      raw271: 'EB*1**30**MEDICAID**7.5~',
      traceId: 'TRACE-ELIG-1',
    });
    expect(postCoreSoapMock).toHaveBeenCalledTimes(1);

    const [url, envelope, passedConfig] = postCoreSoapMock.mock.calls[0];
    expect(url).toBe('https://edi.example.com/CORE/Eligibility');
    expect(envelope).toContain('<cor:PayloadID>TRACE-ELIG-1</cor:PayloadID>');
    expect(envelope).toContain('<cor:PayloadType>270</cor:PayloadType>');
    expect(passedConfig).toBe(cfg);
  });

  it('maps AAA rejection payloads to error eligibility responses', async () => {
    postCoreSoapMock.mockResolvedValue('<cor:COREEnvelopePayload>AAA*Y**75*C~</cor:COREEnvelopePayload>');
    const adapter = new NctracksSoapAdapter(soapConfig());

    await expect(adapter.checkEligibility({
      subscriberId: 'BADMEM999',
      dateOfService: '2026-07-24',
    })).resolves.toMatchObject({
      status: 'error',
      aaaRejection: { code: '75', followUpAction: 'C' },
      coverageDetails: [],
    });
  });

  it('reports health based on configured realtime URL', async () => {
    await expect(new NctracksSoapAdapter(soapConfig()).healthCheck())
      .resolves.toEqual({ realtimeOk: true, sftpOk: false });
  });

  it('fails scaffolded non-SOAP operations with transport errors', async () => {
    const adapter = new NctracksSoapAdapter(soapConfig());

    await expect(adapter.submitClaim(claimReq()))
      .rejects.toMatchObject({ name: 'NctracksTransportError' });
    await expect(adapter.submitClaim(claimReq())).rejects.toThrow(/837P batch submission requires SFTP/);
    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-001',
      subscriberId: 'NCMD00100001',
    })).rejects.toThrow(/276\/277 SOAP transport scaffolded/);
    await expect(adapter.retrieveRemittances()).rejects.toThrow(/835 retrieval requires SFTP/);
    await expect(adapter.pollAcks()).rejects.toThrow(/999\/277CA polling requires SFTP/);
  });
});
