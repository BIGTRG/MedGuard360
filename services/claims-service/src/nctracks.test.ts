import type { ClaimSubmitRequest, ClaimSubmitResult } from '@medguard360/nctracks';
import { shouldUseNctracks, submitNcClaim } from './nctracks';

const mockSubmitClaim = jest.fn<Promise<ClaimSubmitResult>, [ClaimSubmitRequest]>();

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(() => ({
    mode: 'stub',
    submitClaim: mockSubmitClaim,
  })),
}));

const submissionResult: ClaimSubmitResult = {
  interchangeControlNumber: 'ISA000000001',
  groupControlNumber: 'GS000000002',
  transactionSetControlNumber: 'ST000000003',
  fileName: 'mg360_P_20260706_ISA000000001.x12',
  submittedAt: '2026-07-06T10:00:00.000Z',
  ack999: {
    accepted: true,
    errors: [],
    raw: 'AK9*A*1*1*1~',
  },
  ack277CA: {
    status: 'accepted',
    perClaim: [{
      patientControlNumber: 'CCN-TEST-001',
      status: 'accepted',
      categoryCode: 'A0',
      statusCode: '20',
    }],
    raw: 'STC*A0:20~',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.NCTRACKS_MODE;
  delete process.env.NCTRACKS_BILLING_TAXONOMY;
  delete process.env.NCTRACKS_ATYPICAL_ID;
  mockSubmitClaim.mockResolvedValue(submissionResult);
});

describe('shouldUseNctracks', () => {
  it('routes NC claims through NCTracks', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('routes lower-case NC claims through NCTracks', () => {
    expect(shouldUseNctracks('nc')).toBe(true);
  });

  it('skips non-NC claims', () => {
    expect(shouldUseNctracks('SC')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    process.env.NCTRACKS_MODE = 'DISABLED';
    expect(shouldUseNctracks('NC')).toBe(false);
  });
});


describe('submitNcClaim', () => {
  it('returns stub submission metadata for NC professional claims', async () => {
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
        service_date: '20260706',
        place_of_service: '11',
        diagnosis_pointers: [1],
      }],
    });
    expect(result.fileName).toMatch(/^mg360_P_/);
    expect(result.interchangeControlNumber).toBeTruthy();
    expect(result.ack999?.accepted).toBe(true);
  });

  it('normalizes service dates and maps claim fields to the adapter contract', async () => {
    await submitNcClaim({
      ccn: 'CCN-TEST-001',
      totalCharge: 225.5,
      patientMedicaidId: 'NCMD00100001',
      serviceDate: '20260706',
      billingNpi: '1234567890',
      diagnosisCodes: ['Z00.00', 'F41.1'],
      lines: [
        {
          procedure_code: '99213',
          modifier_codes: [],
          units: 1,
          charge_amount: 125.5,
          service_date: '20260706',
          place_of_service: '11',
          diagnosis_pointers: [1],
        },
        {
          procedure_code: '90834',
          modifier_codes: ['GT'],
          units: 1,
          charge_amount: 100,
          service_date: '2026-07-07',
          place_of_service: '02',
          diagnosis_pointers: [2],
        },
      ],
    });

    expect(mockSubmitClaim).toHaveBeenCalledWith({
      claimType: 'professional',
      patientControlNumber: 'CCN-TEST-001',
      totalCharge: 225.5,
      subscriberId: 'NCMD00100001',
      serviceDateFrom: '2026-07-06',
      serviceDateTo: '2026-07-06',
      billingProvider: {
        npi: '1234567890',
        taxonomy: '261Q00000X',
        atypicalId: undefined,
      },
      renderingProvider: {
        npi: '1234567890',
        taxonomy: '261Q00000X',
      },
      diagnoses: [
        { code: 'Z00.00', system: 'ICD10CM' },
        { code: 'F41.1', system: 'ICD10CM' },
      ],
      lines: [
        {
          procedureCode: '99213',
          modifiers: undefined,
          units: 1,
          charge: 125.5,
          serviceDate: '2026-07-06',
          placeOfService: '11',
          diagnosisPointers: [1],
        },
        {
          procedureCode: '90834',
          modifiers: ['GT'],
          units: 1,
          charge: 100,
          serviceDate: '2026-07-07',
          placeOfService: '02',
          diagnosisPointers: [2],
        },
      ],
    });
  });

  it('passes configured billing taxonomy and atypical ID to NCTracks', async () => {
    process.env.NCTRACKS_BILLING_TAXONOMY = '251S00000X';
    process.env.NCTRACKS_ATYPICAL_ID = 'NC-ATYPICAL-001';

    await submitNcClaim({
      ccn: 'CCN-TEST-002',
      totalCharge: 50,
      patientMedicaidId: 'NCMD00100002',
      serviceDate: '2026-07-06',
      billingNpi: '1234567890',
      diagnosisCodes: ['Z00.00'],
      lines: [{
        procedure_code: 'T1015',
        modifier_codes: [],
        units: 1,
        charge_amount: 50,
        service_date: '2026-07-06',
        place_of_service: '11',
        diagnosis_pointers: [1],
      }],
    });

    expect(mockSubmitClaim).toHaveBeenCalledWith(expect.objectContaining({
      billingProvider: {
        npi: '1234567890',
        taxonomy: '251S00000X',
        atypicalId: 'NC-ATYPICAL-001',
      },
      renderingProvider: {
        npi: '1234567890',
        taxonomy: '251S00000X',
      },
    }));
  });
});