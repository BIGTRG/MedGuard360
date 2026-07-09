import type { ClaimSubmitResult } from '@medguard360/nctracks';
import { isNctracksSubmissionAccepted, shouldUseNctracks, submitNcClaim } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC claims through NCTracks', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
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
});

describe('isNctracksSubmissionAccepted', () => {
  const acceptedResult: ClaimSubmitResult = {
    interchangeControlNumber: 'ISA000000001',
    groupControlNumber: 'GS000000001',
    transactionSetControlNumber: 'ST000000001',
    fileName: 'mg360_P_accepted.x12',
    submittedAt: '2026-07-09T11:00:00.000Z',
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

  it('accepts successful NCTracks acknowledgements', () => {
    expect(isNctracksSubmissionAccepted(acceptedResult)).toBe(true);
  });

  it('rejects failed 999 acknowledgements', () => {
    expect(isNctracksSubmissionAccepted({
      ...acceptedResult,
      ack999: {
        accepted: false,
        errors: [{ segment: 'CLM', code: '1', description: 'Invalid claim' }],
        raw: '999',
      },
    })).toBe(false);
  });

  it('rejects failed 277CA acknowledgements', () => {
    expect(isNctracksSubmissionAccepted({
      ...acceptedResult,
      ack277CA: {
        status: 'rejected',
        perClaim: [{
          patientControlNumber: 'CCN-TEST-001',
          status: 'rejected',
          categoryCode: 'A7',
          statusCode: '21',
        }],
        raw: '277CA',
      },
    })).toBe(false);
  });
});