import { loadNctracksConfig } from './config';
import { NctracksSoapAdapter, NctracksTransportError } from './soap-adapter';
import * as httpsPost from './transport/httpsPost';

function soapAdapter(): NctracksSoapAdapter {
  return new NctracksSoapAdapter(loadNctracksConfig({
    NCTRACKS_MODE: 'soap',
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
    NCTRACKS_CLIENT_CERT: 'cert',
    NCTRACKS_CLIENT_KEY: 'key',
    NCTRACKS_SUBMITTER_ID: 'SUBMITTER',
    NCTRACKS_RECEIVER_ID: 'NCXIX',
    NCTRACKS_BILLING_NPI: '1234567890',
  }));
}

describe('NctracksSoapAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts a CORE 270 request and maps an active 271 response', async () => {
    const postCoreSoap = jest
      .spyOn(httpsPost, 'postCoreSoap')
      .mockResolvedValue([
        '<COREEnvelopePayload>',
        'ISA*00*~EB*1**30**MEDICAID STANDARD PLAN**15~',
        '</COREEnvelopePayload>',
      ].join(''));

    const result = await soapAdapter().checkEligibility({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-01',
      traceId: 'TRACE-ELIG',
    });

    expect(postCoreSoap).toHaveBeenCalledTimes(1);
    const [url, envelope] = postCoreSoap.mock.calls[0];
    expect(url).toBe('https://edi.example.com/CORE/Eligibility');
    expect(envelope).toContain('<cor:PayloadType>270</cor:PayloadType>');
    expect(envelope).toContain('<cor:PayloadID>TRACE-ELIG</cor:PayloadID>');
    expect(envelope).toContain('NM1*IL*1*UNKNOWN*UNKNOWN****MI*NCMD00100001~');
    expect(result).toEqual({
      status: 'active',
      benefitPlan: 'MEDICAID STANDARD PLAN',
      coverageDetails: [{
        serviceTypeCode: '30',
        coverageLevel: 'IND',
        copay: 15,
        inNetwork: true,
      }],
      aaaRejection: undefined,
      raw271: 'ISA*00*~EB*1**30**MEDICAID STANDARD PLAN**15~',
      traceId: 'TRACE-ELIG',
    });
  });

  it('maps AAA rejections to error eligibility responses', async () => {
    jest
      .spyOn(httpsPost, 'postCoreSoap')
      .mockResolvedValue('<COREEnvelopePayload>AAA*N**75*C~</COREEnvelopePayload>');

    await expect(soapAdapter().checkEligibility({
      subscriberId: 'BADMEM999',
      dateOfService: '2026-07-01',
      traceId: 'TRACE-AAA',
    })).resolves.toMatchObject({
      status: 'error',
      aaaRejection: { code: '75', followUpAction: 'C' },
      traceId: 'TRACE-AAA',
    });
  });

  it('throws transport errors for batch-only operations', async () => {
    const adapter = soapAdapter();

    await expect(adapter.submitClaim({
      claimType: 'professional',
      patientControlNumber: 'PCN-001',
      totalCharge: 10,
      subscriberId: 'NCMD00100001',
      serviceDateFrom: '2026-07-01',
      serviceDateTo: '2026-07-01',
      diagnoses: [{ code: 'Z00.00', system: 'ICD10CM' }],
      lines: [{
        procedureCode: '99213',
        units: 1,
        charge: 10,
        serviceDate: '2026-07-01',
        diagnosisPointers: [1],
      }],
    })).rejects.toThrow(NctracksTransportError);
    await expect(adapter.retrieveRemittances()).rejects.toThrow(/835 retrieval requires SFTP/);
    await expect(adapter.pollAcks()).rejects.toThrow(/999\/277CA polling requires SFTP/);
  });

  it('throws scaffolded status transport error until 276/277 SOAP is implemented', async () => {
    await expect(soapAdapter().getClaimStatus({
      patientControlNumber: 'PCN-001',
      subscriberId: 'NCMD00100001',
    })).rejects.toThrow(/276\/277 SOAP transport scaffolded/);
  });

  it('reports real-time health from the configured eligibility URL', async () => {
    await expect(soapAdapter().healthCheck()).resolves.toEqual({
      realtimeOk: true,
      sftpOk: false,
    });
  });
});
