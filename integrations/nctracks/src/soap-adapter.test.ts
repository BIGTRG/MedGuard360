import { loadNctracksConfig } from './config';
import { NctracksSoapAdapter } from './soap-adapter';
import * as httpsPost from './transport/httpsPost';

describe('NctracksSoapAdapter.getClaimStatus', () => {
  const env = {
    NCTRACKS_MODE: 'soap',
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
    NCTRACKS_REALTIME_CLAIMSTATUS_URL: 'https://edi.example.com/CORE/ClaimStatus',
    NCTRACKS_CLIENT_CERT: 'cert',
    NCTRACKS_CLIENT_KEY: 'key',
  };

  afterEach(() => jest.restoreAllMocks());

  it('posts 276 CORE envelope and parses 277 response', async () => {
    const config = loadNctracksConfig(env);
    const adapter = new NctracksSoapAdapter(config);
    jest.spyOn(httpsPost, 'postCoreSoap').mockResolvedValue(
      '<cor:COREEnvelopePayload>ST*277*0001~STC*F1:65*20260615~REF*1K*TCN-LIVE~AMT*AU*120.00~</cor:COREEnvelopePayload>',
    );

    const result = await adapter.getClaimStatus({
      patientControlNumber: 'PCN-LIVE',
      subscriberId: 'NCMD00100007',
    });

    expect(httpsPost.postCoreSoap).toHaveBeenCalledWith(
      env.NCTRACKS_REALTIME_CLAIMSTATUS_URL,
      expect.stringContaining('<cor:PayloadType>276</cor:PayloadType>'),
      config,
    );
    expect(result.status).toBe('paid');
    expect(result.payerClaimControlNumber).toBe('TCN-LIVE');
    expect(result.paidAmount).toBe(120);
  });

  it('falls back to eligibility URL when claim status URL is unset', async () => {
    const config = loadNctracksConfig({
      ...env,
      NCTRACKS_REALTIME_CLAIMSTATUS_URL: '',
    });
    const adapter = new NctracksSoapAdapter(config);
    jest.spyOn(httpsPost, 'postCoreSoap').mockResolvedValue(
      '<cor:COREEnvelopePayload>STC*A1:20~</cor:COREEnvelopePayload>',
    );

    await adapter.getClaimStatus({ patientControlNumber: 'PCN-1', subscriberId: 'MID-1' });
    expect(httpsPost.postCoreSoap).toHaveBeenCalledWith(
      env.NCTRACKS_REALTIME_ELIGIBILITY_URL,
      expect.any(String),
      config,
    );
  });
});

describe('NctracksSoapAdapter.checkEligibility', () => {
  const env = {
    NCTRACKS_MODE: 'soap',
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
    NCTRACKS_REALTIME_CLAIMSTATUS_URL: 'https://edi.example.com/CORE/ClaimStatus',
    NCTRACKS_CLIENT_CERT: 'cert',
    NCTRACKS_CLIENT_KEY: 'key',
  };

  afterEach(() => jest.restoreAllMocks());

  it('posts a 270 CORE envelope and maps active 271 benefits with copay', async () => {
    const config = loadNctracksConfig(env);
    const adapter = new NctracksSoapAdapter(config);
    jest.spyOn(httpsPost, 'postCoreSoap').mockResolvedValue(
      '<cor:COREEnvelopePayload>EB*1*IND*30**NC MEDICAID STANDARD**2.50~DTP*291*D8*20260101~DTP*292*D8*20261231~</cor:COREEnvelopePayload>',
    );

    const result = await adapter.checkEligibility({
      subscriberId: 'NCMD00100007',
      dateOfService: '2026-07-30',
      firstName: 'Jane',
      lastName: 'Doe',
      traceId: 'TRACE-270',
    });

    expect(httpsPost.postCoreSoap).toHaveBeenCalledWith(
      env.NCTRACKS_REALTIME_ELIGIBILITY_URL,
      expect.stringContaining('<cor:PayloadType>270</cor:PayloadType>'),
      config,
    );
    expect(result).toMatchObject({
      status: 'active',
      benefitPlan: 'NC MEDICAID STANDARD',
      coverageDetails: [{
        serviceTypeCode: '30',
        coverageLevel: 'IND',
        copay: 2.5,
        inNetwork: true,
      }],
      raw271: expect.stringContaining('EB*1*IND*30'),
      traceId: 'TRACE-270',
    });
  });

  it('surfaces AAA rejections as error eligibility responses', async () => {
    const config = loadNctracksConfig(env);
    const adapter = new NctracksSoapAdapter(config);
    jest.spyOn(httpsPost, 'postCoreSoap').mockResolvedValue(
      '<cor:COREEnvelopePayload>AAA*N**75*C~</cor:COREEnvelopePayload>',
    );

    const result = await adapter.checkEligibility({
      subscriberId: 'NCMD00100999',
      dateOfService: '2026-07-30',
      traceId: 'TRACE-AAA',
    });

    expect(result).toMatchObject({
      status: 'error',
      coverageDetails: [],
      aaaRejection: { code: '75', followUpAction: 'C' },
      raw271: 'AAA*N**75*C~',
      traceId: 'TRACE-AAA',
    });
  });
});