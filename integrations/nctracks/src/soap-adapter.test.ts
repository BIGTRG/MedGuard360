import { loadNctracksConfig } from './config';
import { NctracksSoapAdapter, NctracksTransportError } from './soap-adapter';
import { postCoreSoap } from './transport/httpsPost';
import type { EligibilityRequest, NctracksConfig } from './types';

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
    NCTRACKS_SUBMITTER_ID: 'TP12345',
    NCTRACKS_RECEIVER_ID: 'NCXIX',
    NCTRACKS_BILLING_NPI: '1112223333',
  });
}

function eligibilityRequest(overrides: Partial<EligibilityRequest> = {}): EligibilityRequest {
  return {
    subscriberId: 'NCMD00100007',
    dateOfService: '2026-07-15',
    firstName: 'JANE',
    lastName: 'DOE',
    dob: '1985-05-10',
    traceId: 'TRACE-SOAP-1',
    ...overrides,
  };
}

describe('NctracksSoapAdapter', () => {
  beforeEach(() => {
    postCoreSoapMock.mockReset();
  });

  it('posts a CORE 270 and maps an active 271 response into eligibility coverage', async () => {
    postCoreSoapMock.mockResolvedValue([
      '<cor:COREEnvelopePayload>',
      'EB*1*IND*30**MEDICAID DIRECT**0~',
      'DTP*291*D8*20260701~',
      '</cor:COREEnvelopePayload>',
    ].join(''));

    const result = await new NctracksSoapAdapter(soapConfig()).checkEligibility(eligibilityRequest());

    expect(postCoreSoapMock).toHaveBeenCalledTimes(1);
    const [url, envelope, config] = postCoreSoapMock.mock.calls[0];
    expect(url).toBe('https://edi.example.com/CORE/Eligibility');
    expect(config.mode).toBe('soap');
    expect(envelope).toContain('<cor:PayloadType>270</cor:PayloadType>');
    expect(envelope).toContain('<cor:PayloadID>TRACE-SOAP-1</cor:PayloadID>');
    expect(envelope).toContain('NM1*IL*1*DOE*JANE****MI*NCMD00100007~');

    expect(result).toMatchObject({
      status: 'active',
      benefitPlan: 'MEDICAID DIRECT',
      coverageDetails: [
        { serviceTypeCode: '30', coverageLevel: 'IND', copay: 0, inNetwork: true },
      ],
      raw271: 'EB*1*IND*30**MEDICAID DIRECT**0~DTP*291*D8*20260701~',
      traceId: 'TRACE-SOAP-1',
    });
  });

  it('maps AAA rejections to error status without active coverage', async () => {
    postCoreSoapMock.mockResolvedValue('<COREEnvelopePayload>AAA*N**75*C~</COREEnvelopePayload>');

    const result = await new NctracksSoapAdapter(soapConfig()).checkEligibility(eligibilityRequest({
      traceId: 'TRACE-AAA',
    }));

    expect(result).toMatchObject({
      status: 'error',
      coverageDetails: [],
      aaaRejection: { code: '75', followUpAction: 'C' },
      raw271: 'AAA*N**75*C~',
      traceId: 'TRACE-AAA',
    });
  });

  it('surfaces batch-only operations with transport errors', async () => {
    const adapter = new NctracksSoapAdapter(soapConfig());

    await expect(adapter.submitClaim({
      claimType: 'professional',
      patientControlNumber: 'PCN-001',
      totalCharge: 100,
      subscriberId: 'NCMD00100007',
      serviceDateFrom: '2026-07-15',
      serviceDateTo: '2026-07-15',
      diagnoses: [{ code: 'F41.1', system: 'ICD10CM' }],
      lines: [{
        procedureCode: '99213',
        units: 1,
        charge: 100,
        serviceDate: '2026-07-15',
        diagnosisPointers: [1],
      }],
    })).rejects.toThrow(NctracksTransportError);
  });
});
