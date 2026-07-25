import { shouldUseNctracks, submitNcClaim } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid claims through NCTracks', () => {
    expect(shouldUseNctracks('NC', 'NCXIX')).toBe(true);
  });

  it('skips non-Medicaid NC payers', () => {
    expect(shouldUseNctracks('NC', 'AETNA')).toBe(false);
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

  it('rejects missing Medicaid IDs before submitting to NCTracks', async () => {
    await expect(submitNcClaim({
      ccn: 'CCN-TEST-002',
      totalCharge: 125.5,
      patientMedicaidId: '11111111-1111-4111-8111-111111111111',
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
    })).rejects.toThrow('NCTracks claim submission requires a valid NC Medicaid member ID');
  });

  it('throws when NCTracks returns a rejected acknowledgement', async () => {
    await expect(submitNcClaim({
      ccn: 'CCN-TEST-003',
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
    })).rejects.toThrow('NCTracks rejected the claim submission');
  });
});