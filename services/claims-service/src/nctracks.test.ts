import { shouldUseNctracks, submitNcClaim } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC claims through NCTracks', () => {
    expect(shouldUseNctracks('NC', 'NCXIX')).toBe(true);
  });

  it('does not route NC non-Medicaid claims through NCTracks', () => {
    expect(shouldUseNctracks('NC', 'PALMETTO')).toBe(false);
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

  it('throws when NCTracks rejects the submitted claim', async () => {
    await expect(submitNcClaim({
      ccn: 'CCN-TEST-REJECT',
      totalCharge: -1,
      patientMedicaidId: 'NCMD00100001',
      serviceDate: '20260706',
      billingNpi: '1234567890',
      diagnosisCodes: ['Z00.00'],
      lines: [{
        procedure_code: '99213',
        modifier_codes: [],
        units: 1,
        charge_amount: -1,
        service_date: '20260706',
        place_of_service: '11',
        diagnosis_pointers: [1],
      }],
    })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'NCTracks rejected claim submission',
    });
  });
});