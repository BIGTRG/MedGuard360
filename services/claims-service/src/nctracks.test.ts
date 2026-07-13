import { isUnavailableBatchModeConfigured, shouldUseNctracks, submitNcClaim } from './nctracks';

describe('shouldUseNctracks', () => {
  afterEach(() => {
    delete process.env.NCTRACKS_MODE;
  });

  it('routes NC Medicaid claims with a member ID through NCTracks', () => {
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      patientMedicaidId: 'NCMD00100001',
    })).toBe(true);
  });

  it('skips NC commercial claims', () => {
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'COMMERCIAL_BLUE',
      patientMedicaidId: 'NCMD00100001',
    })).toBe(false);
  });

  it('skips NC Medicaid claims without a member ID', () => {
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
    })).toBe(false);
  });

  it('does not route claims when NCTracks is in SOAP-only eligibility mode', () => {
    process.env.NCTRACKS_MODE = 'soap';
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      patientMedicaidId: 'NCMD00100001',
    })).toBe(false);
  });

  it('treats scaffolded SFTP/live batch modes as unavailable for claim submission', () => {
    process.env.NCTRACKS_MODE = 'live';
    expect(isUnavailableBatchModeConfigured()).toBe(true);
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      patientMedicaidId: 'NCMD00100001',
    })).toBe(false);
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