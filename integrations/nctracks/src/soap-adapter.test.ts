import { NctracksSoapAdapter } from './soap-adapter';
import { postCoreSoap } from './transport/httpsPost';
import type { NctracksConfig } from './types';

jest.mock('./transport/httpsPost', () => ({
  postCoreSoap: jest.fn(),
}));

const mockedPostCoreSoap = postCoreSoap as jest.MockedFunction<typeof postCoreSoap>;

const config: NctracksConfig = {
  mode: 'soap',
  env: 'test',
  realtime: {
    eligibilityUrl: 'https://edi.example.com/CORE/Eligibility',
    claimStatusUrl: 'https://edi.example.com/CORE/ClaimStatus',
    timeoutMs: 30_000,
  },
  batch: {},
  identifiers: {
    tpid: 'TPID',
    submitterId: 'SUBMITTER',
    submitterQualifier: 'ZZ',
    receiverId: 'RECEIVER',
    receiverQualifier: 'ZZ',
    billingNpi: '9876543210',
    billingTaxonomy: '207Q00000X',
    usageIndicator: 'T',
  },
  auth: {
    clientCertPem: 'cert',
    clientKeyPem: 'key',
  },
};

describe('NctracksSoapAdapter.checkEligibility', () => {
  beforeEach(() => {
    mockedPostCoreSoap.mockReset();
  });

  it('maps active 271 coverage into eligibility response fields', async () => {
    mockedPostCoreSoap.mockResolvedValue([
      '<cor:COREEnvelopePayload>',
      'EB*1*IND*30**NC MEDICAID DIRECT*23*2.5~',
      '</cor:COREEnvelopePayload>',
    ].join(''));

    const response = await new NctracksSoapAdapter(config).checkEligibility({
      subscriberId: 'NCMD00100007',
      dateOfService: '2026-07-10',
      providerNpi: '1234567890',
      firstName: 'Ada',
      lastName: 'Lovelace',
      dob: '1980-02-03',
      traceId: 'TRACE-270',
    });

    expect(mockedPostCoreSoap).toHaveBeenCalledWith(
      config.realtime.eligibilityUrl,
      expect.stringContaining('<cor:PayloadID>TRACE-270</cor:PayloadID>'),
      config,
    );
    expect(response).toEqual({
      status: 'active',
      benefitPlan: 'NC MEDICAID DIRECT',
      coverageDetails: [{
        serviceTypeCode: '30',
        coverageLevel: 'IND',
        copay: 2.5,
        inNetwork: true,
      }],
      aaaRejection: undefined,
      raw271: 'EB*1*IND*30**NC MEDICAID DIRECT*23*2.5~',
      traceId: 'TRACE-270',
    });
  });

  it('maps AAA rejection responses to error status for human review', async () => {
    mockedPostCoreSoap.mockResolvedValue(
      '<COREEnvelopePayload>AAA*N**72*C~</COREEnvelopePayload>',
    );

    const response = await new NctracksSoapAdapter(config).checkEligibility({
      subscriberId: 'NCMD00100008',
      dateOfService: '2026-07-10',
      traceId: 'TRACE-AAA',
    });

    expect(response.status).toBe('error');
    expect(response.aaaRejection).toEqual({ code: '72', followUpAction: 'C' });
    expect(response.coverageDetails).toEqual([]);
    expect(response.traceId).toBe('TRACE-AAA');
  });
});
