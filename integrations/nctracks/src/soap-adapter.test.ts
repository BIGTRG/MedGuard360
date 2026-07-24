import { loadNctracksConfig } from './config';
import { NctracksSoapAdapter, NctracksTransportError } from './soap-adapter';
import { postCoreSoap } from './transport/httpsPost';
import type { EligibilityRequest } from './types';

jest.mock('./transport/httpsPost', () => ({
  postCoreSoap: jest.fn(),
}));

const mockedPostCoreSoap = jest.mocked(postCoreSoap);

function makeAdapter(): NctracksSoapAdapter {
  return new NctracksSoapAdapter(loadNctracksConfig({
    NCTRACKS_MODE: 'soap',
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
    NCTRACKS_CLIENT_CERT: 'cert-pem',
    NCTRACKS_CLIENT_KEY: 'key-pem',
    NCTRACKS_SUBMITTER_ID: 'TP12345',
    NCTRACKS_RECEIVER_ID: 'NCXIX',
  }));
}

function request(overrides: Partial<EligibilityRequest> = {}): EligibilityRequest {
  return {
    subscriberId: 'NCMD00100001',
    dateOfService: '2026-07-24',
    firstName: 'JANE',
    lastName: 'DOE',
    dob: '1980-02-03',
    providerNpi: '1234567890',
    traceId: 'TRACE-ELIG-1',
    ...overrides,
  };
}

describe('NctracksSoapAdapter', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-24T10:15:00.000Z'));
    mockedPostCoreSoap.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('posts a CORE 270 envelope and maps active 271 coverage', async () => {
    mockedPostCoreSoap.mockResolvedValueOnce(
      '<cor:COREEnvelopePayload>ST*271*0001~EB*1**30**MEDICAID**2~SE*3*0001~</cor:COREEnvelopePayload>',
    );

    const result = await makeAdapter().checkEligibility(request());

    expect(result).toEqual({
      status: 'active',
      benefitPlan: 'MEDICAID',
      coverageDetails: [{ serviceTypeCode: '30', coverageLevel: 'IND', copay: 2, inNetwork: true }],
      aaaRejection: undefined,
      raw271: 'ST*271*0001~EB*1**30**MEDICAID**2~SE*3*0001~',
      traceId: 'TRACE-ELIG-1',
    });

    const call = mockedPostCoreSoap.mock.calls[0];
    expect(call[0]).toBe('https://edi.example.com/CORE/Eligibility');
    expect(call[1]).toContain('<cor:PayloadType>270</cor:PayloadType>');
    expect(call[1]).toContain('<cor:PayloadID>TRACE-ELIG-1</cor:PayloadID>');
    expect(call[1]).toContain('NM1*IL*1*DOE*JANE****MI*NCMD00100001');
    expect(call[1]).toContain('DTP*291*D8*20260724');
  });

  it('maps AAA rejections to eligibility error responses for human review', async () => {
    mockedPostCoreSoap.mockResolvedValueOnce(
      '<COREEnvelopePayload>ST*271*0001~AAA*N**75*C~SE*3*0001~</COREEnvelopePayload>',
    );

    const result = await makeAdapter().checkEligibility(request({ traceId: undefined }));

    expect(result.status).toBe('error');
    expect(result.aaaRejection).toEqual({ code: '75', followUpAction: 'C' });
    expect(result.coverageDetails).toEqual([]);
    expect(result.traceId).toMatch(/^MG360-\d{9}$/);
  });

  it('keeps non-SOAP operations behind explicit transport errors', async () => {
    const adapter = makeAdapter();

    await expect(adapter.submitClaim({
      claimType: 'professional',
      patientControlNumber: 'PCN-001',
      totalCharge: 100,
      subscriberId: 'NCMD00100001',
      serviceDateFrom: '2026-07-24',
      serviceDateTo: '2026-07-24',
      diagnoses: [{ code: 'Z00.00', system: 'ICD10CM' }],
      lines: [{
        procedureCode: '99213',
        units: 1,
        charge: 100,
        serviceDate: '2026-07-24',
        diagnosisPointers: [1],
      }],
    })).rejects.toThrow(NctracksTransportError);

    await expect(adapter.retrieveRemittances()).rejects.toThrow(/requires SFTP/);
    await expect(adapter.pollAcks()).rejects.toThrow(/requires SFTP/);
  });
});
