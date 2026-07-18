import { loadNctracksConfig } from './config';
import { NctracksSoapAdapter } from './soap-adapter';
import { postCoreSoap } from './transport/httpsPost';
import type { NctracksConfig } from './types';

jest.mock('./transport/httpsPost', () => ({
  postCoreSoap: jest.fn(),
}));

const postCoreSoapMock = jest.mocked(postCoreSoap);

function soapConfig(): NctracksConfig {
  return loadNctracksConfig({
    NCTRACKS_MODE: 'soap',
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.test/core/eligibility',
    NCTRACKS_CLIENT_CERT: 'test-cert',
    NCTRACKS_CLIENT_KEY: 'test-key',
    NCTRACKS_SUBMITTER_ID: 'SUBMITTER',
    NCTRACKS_RECEIVER_ID: 'NCXIX',
    NCTRACKS_BILLING_NPI: '1234567890',
  });
}

describe('NctracksSoapAdapter', () => {
  beforeEach(() => {
    postCoreSoapMock.mockReset();
  });

  it('maps an active 271 response into service eligibility fields', async () => {
    postCoreSoapMock.mockResolvedValue([
      '<cor:COREEnvelopePayload>',
      'ST*271*0001~EB*1*IND*30**NC MEDICAID STANDARD PLAN**3.25~DTP*291*D8*20260701~',
      '</cor:COREEnvelopePayload>',
    ].join(''));

    const adapter = new NctracksSoapAdapter(soapConfig());
    const response = await adapter.checkEligibility({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-18',
      firstName: 'Jane',
      lastName: 'Doe',
      traceId: 'TRACE-ELIG-1',
    });

    expect(postCoreSoapMock).toHaveBeenCalledWith(
      'https://edi.example.test/core/eligibility',
      expect.stringContaining('<cor:PayloadID>TRACE-ELIG-1</cor:PayloadID>'),
      expect.objectContaining({ mode: 'soap' }),
    );
    expect(response).toEqual({
      status: 'active',
      benefitPlan: 'NC MEDICAID STANDARD PLAN',
      coverageDetails: [{
        serviceTypeCode: '30',
        coverageLevel: 'IND',
        copay: 3.25,
        inNetwork: true,
      }],
      aaaRejection: undefined,
      raw271: 'ST*271*0001~EB*1*IND*30**NC MEDICAID STANDARD PLAN**3.25~DTP*291*D8*20260701~',
      traceId: 'TRACE-ELIG-1',
    });
  });

  it('maps AAA rejections to error eligibility responses with audit payload intact', async () => {
    postCoreSoapMock.mockResolvedValue('<COREEnvelopePayload>ST*271*0001~AAA*N**72*C~SE*3*0001~</COREEnvelopePayload>');

    const adapter = new NctracksSoapAdapter(soapConfig());
    const response = await adapter.checkEligibility({
      subscriberId: 'BADMEM999',
      dateOfService: '2026-07-18',
      traceId: 'TRACE-AAA-1',
    });

    expect(response).toEqual({
      status: 'error',
      benefitPlan: undefined,
      coverageDetails: [],
      aaaRejection: { code: '72', followUpAction: 'C' },
      raw271: 'ST*271*0001~AAA*N**72*C~SE*3*0001~',
      traceId: 'TRACE-AAA-1',
    });
  });
});
