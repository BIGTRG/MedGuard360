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

  it('posts a 270 CORE envelope and maps an active 271 response with copay', async () => {
    const config = loadNctracksConfig(env);
    const adapter = new NctracksSoapAdapter(config);
    jest.spyOn(httpsPost, 'postCoreSoap').mockResolvedValue(
      '<cor:COREEnvelopePayload>ST*271*0001~EB*1**30**MEDICAID**15.00~DTP*291*D8*20260701~</cor:COREEnvelopePayload>',
    );

    const result = await adapter.checkEligibility({
      subscriberId: 'NCMD00100007',
      dateOfService: '2026-07-30',
      firstName: 'Jane',
      lastName: 'Doe',
      providerNpi: '1234567890',
      traceId: 'TRACE-271',
    });

    expect(httpsPost.postCoreSoap).toHaveBeenCalledWith(
      env.NCTRACKS_REALTIME_ELIGIBILITY_URL,
      expect.stringContaining('<cor:PayloadType>270</cor:PayloadType>'),
      config,
    );
    expect(result.status).toBe('active');
    expect(result.traceId).toBe('TRACE-271');
    expect(result.benefitPlan).toBe('MEDICAID');
    expect(result.coverageDetails).toEqual([
      { serviceTypeCode: '30', coverageLevel: 'IND', copay: 15, inNetwork: true },
    ]);
    expect(result.raw271).toContain('ST*271*0001');
  });
});