import * as nctracksAdapter from '@medguard360/nctracks';
import type { ClaimSubmitRequest, ClaimSubmitResult, NctracksAdapter } from '@medguard360/nctracks';
import { shouldUseNctracks, submitNcClaim } from './nctracks';

const originalEnv = { ...process.env };

afterEach(() => {
  jest.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe('shouldUseNctracks', () => {
  it('routes NC claims through NCTracks', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('skips non-NC claims', () => {
    expect(shouldUseNctracks('SC')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled before config loading', () => {
    process.env.NCTRACKS_MODE = 'disabled';

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

  it('normalizes claim fields before submitting the NCTracks 837P request', async () => {
    process.env.NCTRACKS_BILLING_TAXONOMY = '261QM0801X';
    process.env.NCTRACKS_ATYPICAL_ID = 'ATYPICAL-NC-01';

    let capturedRequest: ClaimSubmitRequest | undefined;
    const fakeResult: ClaimSubmitResult = {
      interchangeControlNumber: 'ISA000000123',
      groupControlNumber: 'GS000000124',
      transactionSetControlNumber: 'ST000000125',
      fileName: 'mg360_P_123_ISA000000123.x12',
      submittedAt: '2026-07-06T12:00:00.000Z',
      ack999: { accepted: true, errors: [], raw: '999' },
    };
    const adapter: NctracksAdapter = {
      mode: 'stub',
      checkEligibility: async () => { throw new Error('not used'); },
      submitClaim: jest.fn(async (request: ClaimSubmitRequest) => {
        capturedRequest = request;
        return fakeResult;
      }),
      getClaimStatus: async () => { throw new Error('not used'); },
      retrieveRemittances: async () => { throw new Error('not used'); },
      pollAcks: async () => { throw new Error('not used'); },
      healthCheck: async () => ({ realtimeOk: true, sftpOk: true }),
    };
    jest.spyOn(nctracksAdapter, 'createNctracksAdapter').mockReturnValue(adapter);

    const result = await submitNcClaim({
      ccn: 'CCN-TEST-002',
      totalCharge: 200,
      patientMedicaidId: 'NCMD00100007',
      serviceDate: '20260706',
      billingNpi: '1234567890',
      diagnosisCodes: ['F41.1', 'Z79.899'],
      lines: [
        {
          procedure_code: '90834',
          modifier_codes: ['GT', '95'],
          units: 1,
          charge_amount: 150,
          service_date: '2026-07-06',
          place_of_service: '02',
          diagnosis_pointers: [1],
        },
        {
          procedure_code: 'H0032',
          modifier_codes: [],
          units: 2,
          charge_amount: 50,
          service_date: '20260707',
          place_of_service: '11',
          diagnosis_pointers: [1, 2],
        },
      ],
    });

    expect(result).toBe(fakeResult);
    expect(adapter.submitClaim).toHaveBeenCalledTimes(1);
    expect(capturedRequest).toEqual({
      claimType: 'professional',
      patientControlNumber: 'CCN-TEST-002',
      totalCharge: 200,
      subscriberId: 'NCMD00100007',
      serviceDateFrom: '2026-07-06',
      serviceDateTo: '2026-07-06',
      billingProvider: {
        npi: '1234567890',
        taxonomy: '261QM0801X',
        atypicalId: 'ATYPICAL-NC-01',
      },
      renderingProvider: {
        npi: '1234567890',
        taxonomy: '261QM0801X',
      },
      diagnoses: [
        { code: 'F41.1', system: 'ICD10CM' },
        { code: 'Z79.899', system: 'ICD10CM' },
      ],
      lines: [
        {
          procedureCode: '90834',
          modifiers: ['GT', '95'],
          units: 1,
          charge: 150,
          serviceDate: '2026-07-06',
          placeOfService: '02',
          diagnosisPointers: [1],
        },
        {
          procedureCode: 'H0032',
          modifiers: undefined,
          units: 2,
          charge: 50,
          serviceDate: '2026-07-07',
          placeOfService: '11',
          diagnosisPointers: [1, 2],
        },
      ],
    });
  });
});