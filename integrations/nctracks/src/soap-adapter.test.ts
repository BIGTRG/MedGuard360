import { NctracksSoapAdapter } from './soap-adapter';
import { postCoreSoap } from './transport/httpsPost';
import type { EligibilityRequest, NctracksConfig } from './types';

jest.mock('./transport/httpsPost', () => ({
  postCoreSoap: jest.fn(),
}));

const mockPostCoreSoap = jest.mocked(postCoreSoap);

const config: NctracksConfig = {
  mode: 'soap',
  env: 'test',
  realtime: {
    eligibilityUrl: 'https://edi.example.test/core/eligibility',
    claimStatusUrl: 'https://edi.example.test/core/status',
    timeoutMs: 10_000,
  },
  batch: {},
  identifiers: {
    tpid: 'TPID-TEST',
    submitterId: 'SUBMITTER01',
    submitterQualifier: 'ZZ',
    receiverId: 'NCXIX',
    receiverQualifier: 'ZZ',
    billingNpi: '1111111111',
    billingTaxonomy: '207Q00000X',
    usageIndicator: 'T',
  },
  auth: {
    clientCertPem: 'test-cert',
    clientKeyPem: 'test-key',
  },
};

const eligibilityRequest: EligibilityRequest = {
  subscriberId: 'NCMD00100001',
  dateOfService: '2026-07-20',
  serviceTypeCodes: ['30'],
  providerNpi: '1234567890',
  firstName: 'Jane',
  lastName: 'Doe',
  dob: '1980-02-03',
  traceId: 'TRACE-270-001',
};

function coreResponse(x12Payload: string): string {
  return [
    '<soap:Envelope>',
    '<soap:Body>',
    '<cor:COREEnvelopeRealTimeResponse>',
    `<cor:COREEnvelopePayload>${x12Payload}</cor:COREEnvelopePayload>`,
    '</cor:COREEnvelopeRealTimeResponse>',
    '</soap:Body>',
    '</soap:Envelope>',
  ].join('');
}

describe('NctracksSoapAdapter.checkEligibility', () => {
  beforeEach(() => {
    mockPostCoreSoap.mockReset();
  });

  it('posts a 270 CORE SOAP envelope and maps active 271 benefits', async () => {
    mockPostCoreSoap.mockResolvedValue(
      coreResponse('ISA*00*~ST*271*0001~EB*1**30**NC MEDICAID**3.5~SE*3*0001~'),
    );

    const result = await new NctracksSoapAdapter(config).checkEligibility(eligibilityRequest);

    expect(mockPostCoreSoap).toHaveBeenCalledTimes(1);
    const [url, envelope, postedConfig] = mockPostCoreSoap.mock.calls[0];
    expect(url).toBe(config.realtime.eligibilityUrl);
    expect(postedConfig).toBe(config);
    expect(envelope).toContain('<cor:PayloadType>270</cor:PayloadType>');
    expect(envelope).toContain('<cor:PayloadID>TRACE-270-001</cor:PayloadID>');
    expect(envelope).toContain('<cor:SenderID>SUBMITTER01</cor:SenderID>');
    expect(envelope).toContain('<cor:ReceiverID>NCXIX</cor:ReceiverID>');
    expect(envelope).toContain('BHT*0022*13*TRACE-270-001');
    expect(envelope).toContain('NM1*1P*2*PROVIDER*****XX*1234567890');
    expect(envelope).toContain('NM1*IL*1*Doe*Jane****MI*NCMD00100001');
    expect(envelope).toContain('DMG*D8*19800203*U');
    expect(envelope).toContain('DTP*291*D8*20260720');
    expect(envelope).toContain('EQ*30');

    expect(result).toEqual({
      status: 'active',
      benefitPlan: 'NC MEDICAID',
      coverageDetails: [{
        serviceTypeCode: '30',
        coverageLevel: 'IND',
        copay: 3.5,
        inNetwork: true,
      }],
      aaaRejection: undefined,
      raw271: 'ISA*00*~ST*271*0001~EB*1**30**NC MEDICAID**3.5~SE*3*0001~',
      traceId: 'TRACE-270-001',
    });
  });

  it('maps AAA rejections to an error response without active coverage', async () => {
    mockPostCoreSoap.mockResolvedValue(
      coreResponse('ISA*00*~ST*271*0001~AAA*N**75*C~SE*3*0001~'),
    );

    const result = await new NctracksSoapAdapter(config).checkEligibility(eligibilityRequest);

    expect(result.status).toBe('error');
    expect(result.coverageDetails).toEqual([]);
    expect(result.aaaRejection).toEqual({ code: '75', followUpAction: 'C' });
    expect(result.raw271).toContain('AAA*N**75*C');
    expect(result.traceId).toBe('TRACE-270-001');
  });

  it('propagates transport failures instead of returning synthetic eligibility', async () => {
    const failure = new Error('NCTracks SOAP HTTP 500: unavailable');
    mockPostCoreSoap.mockRejectedValue(failure);

    await expect(new NctracksSoapAdapter(config).checkEligibility(eligibilityRequest))
      .rejects.toThrow('NCTracks SOAP HTTP 500: unavailable');
  });
});
