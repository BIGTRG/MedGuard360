import { loadNctracksConfig } from './config';
import { NctracksSoapAdapter } from './soap-adapter';
import { postCoreSoap } from './transport/httpsPost';
import type { ClaimSubmitRequest, EligibilityRequest, NctracksConfig } from './types';

jest.mock('./transport/httpsPost', () => ({
  postCoreSoap: jest.fn(),
}));

const mockedPostCoreSoap = jest.mocked(postCoreSoap);

function makeSoapConfig(): NctracksConfig {
  return loadNctracksConfig({
    NCTRACKS_MODE: 'soap',
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
    NCTRACKS_CLIENT_CERT: '-----BEGIN CERTIFICATE-----test-----END CERTIFICATE-----',
    NCTRACKS_CLIENT_KEY: '-----BEGIN PRIVATE KEY-----test-----END PRIVATE KEY-----',
    NCTRACKS_SUBMITTER_ID: 'MG360SUBMITTER',
    NCTRACKS_RECEIVER_ID: 'NCXIX',
    NCTRACKS_BILLING_NPI: '1234567890',
  });
}

function eligibilityRequest(overrides: Partial<EligibilityRequest> = {}): EligibilityRequest {
  return {
    subscriberId: 'NCMD00100001',
    dateOfService: '2026-07-21',
    providerNpi: '1098765432',
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '1980-01-02',
    traceId: 'TRACE-ELIG-001',
    ...overrides,
  };
}

function coreResponse(raw271: string): string {
  return [
    '<soap:Envelope>',
    '  <soap:Body>',
    '    <cor:COREEnvelopeRealTimeResponse>',
    `      <cor:COREEnvelopePayload>${raw271}</cor:COREEnvelopePayload>`,
    '    </cor:COREEnvelopeRealTimeResponse>',
    '  </soap:Body>',
    '</soap:Envelope>',
  ].join('\n');
}

function claimRequest(): ClaimSubmitRequest {
  return {
    claimType: 'professional',
    patientControlNumber: 'PCN-SOAP-001',
    totalCharge: 100,
    subscriberId: 'NCMD00100001',
    serviceDateFrom: '2026-07-21',
    serviceDateTo: '2026-07-21',
    diagnoses: [{ code: 'G44.1', system: 'ICD10CM' }],
    lines: [{
      procedureCode: '99213',
      units: 1,
      charge: 100,
      serviceDate: '2026-07-21',
      diagnosisPointers: [1],
    }],
  };
}

describe('NctracksSoapAdapter.checkEligibility', () => {
  beforeEach(() => {
    mockedPostCoreSoap.mockReset();
  });

  it('posts a 270 CORE envelope and maps active 271 coverage details', async () => {
    const raw271 = 'ISA*00*~ST*271*0001~EB*1*IND*30*MC*NC MEDICAID**3.5~SE*3*0001~';
    mockedPostCoreSoap.mockResolvedValue(coreResponse(raw271));

    const config = makeSoapConfig();
    const response = await new NctracksSoapAdapter(config).checkEligibility(eligibilityRequest());

    expect(mockedPostCoreSoap).toHaveBeenCalledWith(
      'https://edi.example.com/CORE/Eligibility',
      expect.stringContaining('<cor:PayloadType>270</cor:PayloadType>'),
      config,
    );
    const envelope = mockedPostCoreSoap.mock.calls[0]?.[1] ?? '';
    expect(envelope).toContain('<cor:PayloadID>TRACE-ELIG-001</cor:PayloadID>');
    expect(envelope).toContain('NM1*IL*1*Doe*Jane****MI*NCMD00100001~');
    expect(envelope).toContain('NM1*1P*2*PROVIDER*****XX*1098765432~');
    expect(envelope).toContain('DTP*291*D8*20260721~');

    expect(response).toEqual({
      status: 'active',
      benefitPlan: 'NC MEDICAID',
      coverageDetails: [{
        serviceTypeCode: '30',
        coverageLevel: 'IND',
        copay: 3.5,
        inNetwork: true,
      }],
      aaaRejection: undefined,
      raw271,
      traceId: 'TRACE-ELIG-001',
    });
  });

  it('maps AAA rejections to an error response with raw 271 retained', async () => {
    const raw271 = 'ST*271*0001~AAA*N**75*C~SE*2*0001~';
    mockedPostCoreSoap.mockResolvedValue(coreResponse(raw271));

    const response = await new NctracksSoapAdapter(makeSoapConfig())
      .checkEligibility(eligibilityRequest({ traceId: 'TRACE-AAA-75' }));

    expect(response.status).toBe('error');
    expect(response.aaaRejection).toEqual({ code: '75', followUpAction: 'C' });
    expect(response.coverageDetails).toEqual([]);
    expect(response.raw271).toBe(raw271);
    expect(response.traceId).toBe('TRACE-AAA-75');
  });

  it('treats a 271 without active EB or AAA segments as inactive', async () => {
    mockedPostCoreSoap.mockResolvedValue(coreResponse('ST*271*0001~SE*2*0001~'));

    const response = await new NctracksSoapAdapter(makeSoapConfig())
      .checkEligibility(eligibilityRequest({ traceId: 'TRACE-INACTIVE' }));

    expect(response.status).toBe('inactive');
    expect(response.benefitPlan).toBeUndefined();
    expect(response.coverageDetails).toEqual([]);
    expect(response.aaaRejection).toBeUndefined();
  });

  it('rejects malformed CORE SOAP responses instead of fabricating eligibility', async () => {
    mockedPostCoreSoap.mockResolvedValue('<soap:Envelope><soap:Body /></soap:Envelope>');

    await expect(new NctracksSoapAdapter(makeSoapConfig())
      .checkEligibility(eligibilityRequest()))
      .rejects.toThrow(/missing COREEnvelopePayload/);
  });
});

describe('NctracksSoapAdapter scaffolded operations', () => {
  it('reports SFTP-required operations instead of silently accepting batch work', async () => {
    const adapter = new NctracksSoapAdapter(makeSoapConfig());

    await expect(adapter.submitClaim(claimRequest()))
      .rejects.toThrow(/837P batch submission requires SFTP/);
    await expect(adapter.retrieveRemittances())
      .rejects.toThrow(/835 retrieval requires SFTP/);
    await expect(adapter.pollAcks())
      .rejects.toThrow(/999\/277CA polling requires SFTP/);
  });

  it('keeps claim-status SOAP scaffold explicit until URLs are confirmed', async () => {
    const adapter = new NctracksSoapAdapter(makeSoapConfig());

    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-SOAP-001',
      subscriberId: 'NCMD00100001',
    })).rejects.toThrow(/276\/277 SOAP transport scaffolded/);
  });

  it('healthCheck reflects realtime URL availability and no SFTP channel', async () => {
    await expect(new NctracksSoapAdapter(makeSoapConfig()).healthCheck())
      .resolves.toEqual({ realtimeOk: true, sftpOk: false });
  });
});
