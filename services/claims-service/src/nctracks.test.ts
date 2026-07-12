import { shouldUseNctracks, submitNcClaim } from './nctracks';

describe('shouldUseNctracks', () => {
  const originalMode = process.env.NCTRACKS_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.NCTRACKS_MODE;
    } else {
      process.env.NCTRACKS_MODE = originalMode;
    }
  });

  it('routes NC claims through the implemented NCTracks stub', () => {
    process.env.NCTRACKS_MODE = 'stub';
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('keeps scaffolded live transports off the claim submission path', () => {
    process.env.NCTRACKS_MODE = 'soap';
    expect(shouldUseNctracks('NC')).toBe(false);

    process.env.NCTRACKS_MODE = 'sftp';
    expect(shouldUseNctracks('NC')).toBe(false);

    process.env.NCTRACKS_MODE = 'live';
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
});