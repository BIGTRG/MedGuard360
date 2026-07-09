import {
  createNctracksAdapter,
  type ClaimSubmitRequest,
  type ClaimSubmitResult,
  type NctracksAdapter,
} from '@medguard360/nctracks';
import { shouldUseNctracks, submitNcClaim } from './nctracks';

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(),
}));

const createNctracksAdapterMock = jest.mocked(createNctracksAdapter);

const submitResult: ClaimSubmitResult = {
  interchangeControlNumber: 'ISA000000001',
  groupControlNumber: 'GS000000002',
  transactionSetControlNumber: 'ST000000003',
  fileName: 'mg360_P_20260706_ISA000000001.x12',
  submittedAt: '2026-07-06T12:00:00.000Z',
  ack999: { accepted: true, errors: [], raw: '999' },
  ack277CA: {
    status: 'accepted',
    perClaim: [{
      patientControlNumber: 'CCN-TEST-001',
      status: 'accepted',
      categoryCode: 'A0',
      statusCode: '20',
    }],
    raw: '277CA',
  },
};

describe('shouldUseNctracks', () => {
  it('routes NC claims through NCTracks', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('skips non-NC claims and honors disabled mode', () => {
    expect(shouldUseNctracks('SC')).toBe(false);

    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC')).toBe(false);
    delete process.env.NCTRACKS_MODE;
  });
});


describe('submitNcClaim', () => {
  let capturedRequest: ClaimSubmitRequest | undefined;

  beforeEach(() => {
    capturedRequest = undefined;
    const adapter: NctracksAdapter = {
      mode: 'stub',
      checkEligibility: async () => ({
        status: 'inactive',
        coverageDetails: [],
        raw271: '',
        traceId: 'unused',
      }),
      submitClaim: jest.fn(async (request: ClaimSubmitRequest) => {
        capturedRequest = request;
        return submitResult;
      }),
      getClaimStatus: async () => ({
        status: 'pending',
        categoryCode: 'A1',
        statusCode: '20',
        raw277: '',
      }),
      retrieveRemittances: async () => [],
      pollAcks: async () => ({ ack999: [], ack277CA: [] }),
      healthCheck: async () => ({ realtimeOk: true, sftpOk: true }),
    };
    createNctracksAdapterMock.mockReturnValue(adapter);
  });

  it('maps claim data into a normalized NCTracks professional submission', async () => {
    const result = await submitNcClaim({
      ccn: 'CCN-TEST-001',
      totalCharge: 125.5,
      patientMedicaidId: 'NCMD00100001',
      serviceDate: '20260706',
      billingNpi: '1234567890',
      diagnosisCodes: ['Z00.00'],
      lines: [{
        procedure_code: '99213',
        modifier_codes: [],
        units: 1,
        charge_amount: 125.5,
        service_date: '2026-07-07',
        place_of_service: '11',
        diagnosis_pointers: [1],
      }],
    });

    expect(result.fileName).toMatch(/^mg360_P_/);
    expect(result.interchangeControlNumber).toBeTruthy();
    expect(result.ack999?.accepted).toBe(true);
    expect(capturedRequest).toMatchObject({
      claimType: 'professional',
      patientControlNumber: 'CCN-TEST-001',
      totalCharge: 125.5,
      subscriberId: 'NCMD00100001',
      serviceDateFrom: '2026-07-06',
      serviceDateTo: '2026-07-06',
      billingProvider: { npi: '1234567890', taxonomy: '261Q00000X' },
      renderingProvider: { npi: '1234567890', taxonomy: '261Q00000X' },
      diagnoses: [{ code: 'Z00.00', system: 'ICD10CM' }],
      lines: [{
        procedureCode: '99213',
        modifiers: undefined,
        units: 1,
        charge: 125.5,
        serviceDate: '2026-07-07',
        placeOfService: '11',
        diagnosisPointers: [1],
      }],
    });
  });
});