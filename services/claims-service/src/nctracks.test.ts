import {
  createNctracksAdapter,
  type ClaimSubmitRequest,
  type ClaimSubmitResult,
  type NctracksAdapter,
} from '@medguard360/nctracks';
import { shouldUseNctracks, type NcClaimSubmitInput, submitNcClaim } from './nctracks';

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(),
}));

jest.mock('@medguard360/shared', () => ({
  logger: { info: jest.fn() },
}));

const createAdapterMock = createNctracksAdapter as jest.MockedFunction<typeof createNctracksAdapter>;

const originalEnv = process.env;

function makeInput(overrides: Partial<NcClaimSubmitInput> = {}): NcClaimSubmitInput {
  return {
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
      service_date: '20260706',
      place_of_service: '11',
      diagnosis_pointers: [1],
    }],
    ...overrides,
  };
}

function makeResult(overrides: Partial<ClaimSubmitResult> = {}): ClaimSubmitResult {
  return {
    fileName: 'mg360_P_123456789_ISA000000001.x12',
    interchangeControlNumber: 'ISA000000001',
    groupControlNumber: 'GS000000002',
    transactionSetControlNumber: 'ST000000003',
    submittedAt: '2026-07-06T12:00:00.000Z',
    ack999: {
      accepted: true,
      errors: [],
      raw: '999*ACCEPTED',
    },
    ack277CA: {
      status: 'accepted',
      perClaim: [{
        patientControlNumber: 'CCN-TEST-001',
        status: 'accepted',
        categoryCode: 'A0',
        statusCode: '20',
      }],
      raw: '277CA*ACCEPTED',
    },
    ...overrides,
  };
}

function mockAdapter(result: ClaimSubmitResult): { requests: ClaimSubmitRequest[] } {
  const requests: ClaimSubmitRequest[] = [];
  const adapter: NctracksAdapter = {
    mode: 'stub',
    checkEligibility: async () => {
      throw new Error('checkEligibility should not be called by submitNcClaim');
    },
    submitClaim: async (request) => {
      requests.push(request);
      return result;
    },
    getClaimStatus: async () => {
      throw new Error('getClaimStatus should not be called by submitNcClaim');
    },
    retrieveRemittances: async () => {
      throw new Error('retrieveRemittances should not be called by submitNcClaim');
    },
    pollAcks: async () => {
      throw new Error('pollAcks should not be called by submitNcClaim');
    },
    healthCheck: async () => ({ realtimeOk: true, sftpOk: true }),
  };

  createAdapterMock.mockReturnValue(adapter);
  return { requests };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  delete process.env.NCTRACKS_MODE;
  delete process.env.NCTRACKS_BILLING_TAXONOMY;
  delete process.env.NCTRACKS_ATYPICAL_ID;
});

afterAll(() => {
  process.env = originalEnv;
});

describe('shouldUseNctracks', () => {
  it('routes NC claims through NCTracks', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('skips non-NC state claims', () => {
    expect(shouldUseNctracks('SC')).toBe(false);
    expect(shouldUseNctracks('GA')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled for NC claims', () => {
    process.env.NCTRACKS_MODE = 'DISABLED';

    expect(shouldUseNctracks('NC')).toBe(false);
  });
});

describe('submitNcClaim', () => {
  it('maps claim rows into the NCTracks professional claim request', async () => {
    const { requests } = mockAdapter(makeResult());
    process.env.NCTRACKS_BILLING_TAXONOMY = '261QM0850X';
    process.env.NCTRACKS_ATYPICAL_ID = 'ATYPICAL-001';

    await submitNcClaim(makeInput({
      totalCharge: 350,
      serviceDate: '20260706',
      diagnosisCodes: ['F41.1', 'Z63.0'],
      lines: [
        {
          procedure_code: '90837',
          modifier_codes: ['GT'],
          units: 1,
          charge_amount: 250,
          service_date: '2026-07-06',
          place_of_service: '02',
          diagnosis_pointers: [1],
        },
        {
          procedure_code: 'H0035',
          modifier_codes: [],
          units: 2,
          charge_amount: 100,
          service_date: '20260707',
          place_of_service: '11',
          diagnosis_pointers: [1, 2],
        },
      ],
    }));

    expect(createAdapterMock).toHaveBeenCalledTimes(1);
    expect(requests).toEqual([{
      claimType: 'professional',
      patientControlNumber: 'CCN-TEST-001',
      totalCharge: 350,
      subscriberId: 'NCMD00100001',
      serviceDateFrom: '2026-07-06',
      serviceDateTo: '2026-07-06',
      billingProvider: {
        npi: '1234567890',
        taxonomy: '261QM0850X',
        atypicalId: 'ATYPICAL-001',
      },
      renderingProvider: {
        npi: '1234567890',
        taxonomy: '261QM0850X',
      },
      diagnoses: [
        { code: 'F41.1', system: 'ICD10CM' },
        { code: 'Z63.0', system: 'ICD10CM' },
      ],
      lines: [
        {
          procedureCode: '90837',
          modifiers: ['GT'],
          units: 1,
          charge: 250,
          serviceDate: '2026-07-06',
          placeOfService: '02',
          diagnosisPointers: [1],
        },
        {
          procedureCode: 'H0035',
          modifiers: undefined,
          units: 2,
          charge: 100,
          serviceDate: '2026-07-07',
          placeOfService: '11',
          diagnosisPointers: [1, 2],
        },
      ],
    }]);
  });

  it('passes through adapter rejection acknowledgments', async () => {
    const rejected = makeResult({
      ack999: {
        accepted: false,
        errors: [{ segment: 'CLM', code: '1', description: 'Invalid totalCharge or no diagnosis' }],
        raw: '999*REJECTED',
      },
      ack277CA: {
        status: 'rejected',
        perClaim: [{
          patientControlNumber: 'CCN-TEST-001',
          status: 'rejected',
          categoryCode: 'A7',
          statusCode: '21',
        }],
        raw: '277CA*REJECTED',
      },
    });
    mockAdapter(rejected);

    const result = await submitNcClaim(makeInput({ diagnosisCodes: [] }));

    expect(result.ack999?.accepted).toBe(false);
    expect(result.ack277CA?.status).toBe('rejected');
  });
});