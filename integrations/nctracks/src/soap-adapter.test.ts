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