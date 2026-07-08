import type { ClaimSubmitRequest, ClaimSubmitResult } from '@medguard360/nctracks';
import { submitNcClaim } from './nctracks';

const mockSubmitClaim = jest.fn<Promise<ClaimSubmitResult>, [ClaimSubmitRequest]>();

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(() => ({
    mode: 'stub',
    submitClaim: mockSubmitClaim,
  })),
}));

describe('submitNcClaim payload mapping', () => {
  const originalBillingTaxonomy = process.env.NCTRACKS_BILLING_TAXONOMY;
  const originalAtypicalId = process.env.NCTRACKS_ATYPICAL_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NCTRACKS_BILLING_TAXONOMY = '251B00000X';
    process.env.NCTRACKS_ATYPICAL_ID = 'ATYP-NC';
    mockSubmitClaim.mockResolvedValue({
      interchangeControlNumber: 'ISA000001',
      groupControlNumber: 'GS000001',
      transactionSetControlNumber: 'ST000001',
      fileName: 'mg360_P_ISA000001.837',
      submittedAt: '2026-07-06T12:00:00.000Z',
      ack999: {
        accepted: true,
        errors: [],
        raw: '999',
      },
    });
  });

  afterEach(() => {
    if (originalBillingTaxonomy === undefined) {
      delete process.env.NCTRACKS_BILLING_TAXONOMY;
    } else {
      process.env.NCTRACKS_BILLING_TAXONOMY = originalBillingTaxonomy;
    }

    if (originalAtypicalId === undefined) {
      delete process.env.NCTRACKS_ATYPICAL_ID;
    } else {
      process.env.NCTRACKS_ATYPICAL_ID = originalAtypicalId;
    }
  });

  it('normalizes claim dates and forwards billing, diagnosis, and service-line details', async () => {
    await submitNcClaim({
      ccn: 'CCN-TEST-002',
      totalCharge: 175.25,
      patientMedicaidId: 'NCMD00100007',
      serviceDate: '20260706',
      billingNpi: '1234567890',
      diagnosisCodes: ['F41.1', 'Z79.899'],
      lines: [
        {
          procedure_code: '99213',
          modifier_codes: [],
          units: 1,
          charge_amount: 125.25,
          service_date: '20260706',
          place_of_service: '11',
          diagnosis_pointers: [1],
        },
        {
          procedure_code: '90834',
          modifier_codes: ['GT'],
          units: 1,
          charge_amount: 50,
          service_date: '2026-07-07',
          place_of_service: '02',
          diagnosis_pointers: [1, 2],
        },
      ],
    });

    expect(mockSubmitClaim).toHaveBeenCalledTimes(1);
    expect(mockSubmitClaim).toHaveBeenCalledWith({
      claimType: 'professional',
      patientControlNumber: 'CCN-TEST-002',
      totalCharge: 175.25,
      subscriberId: 'NCMD00100007',
      serviceDateFrom: '2026-07-06',
      serviceDateTo: '2026-07-06',
      billingProvider: {
        npi: '1234567890',
        taxonomy: '251B00000X',
        atypicalId: 'ATYP-NC',
      },
      renderingProvider: {
        npi: '1234567890',
        taxonomy: '251B00000X',
      },
      diagnoses: [
        { code: 'F41.1', system: 'ICD10CM' },
        { code: 'Z79.899', system: 'ICD10CM' },
      ],
      lines: [
        {
          procedureCode: '99213',
          modifiers: undefined,
          units: 1,
          charge: 125.25,
          serviceDate: '2026-07-06',
          placeOfService: '11',
          diagnosisPointers: [1],
        },
        {
          procedureCode: '90834',
          modifiers: ['GT'],
          units: 1,
          charge: 50,
          serviceDate: '2026-07-07',
          placeOfService: '02',
          diagnosisPointers: [1, 2],
        },
      ],
    });
  });
});
