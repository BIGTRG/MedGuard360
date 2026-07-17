import { lookupNctracks, shouldUseNctracks } from './nctracks';

describe('shouldUseNctracks', () => {
  const ncMedicaidInput = {
    stateCode: 'NC',
    payerId: 'NCXIX',
    coverageType: 'medicaid',
    medicaidId: 'NCMD00100001',
  };

  afterEach(() => {
    delete process.env.NCTRACKS_MODE;
  });

  it('routes NC Medicaid member checks to NCTracks by default', () => {
    expect(shouldUseNctracks(ncMedicaidInput)).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks({ ...ncMedicaidInput, stateCode: 'GA' })).toBe(false);
  });

  it('skips non-Medicaid coverage types', () => {
    expect(shouldUseNctracks({ ...ncMedicaidInput, coverageType: 'commercial' })).toBe(false);
    expect(shouldUseNctracks({ ...ncMedicaidInput, coverageType: 'medicare' })).toBe(false);
  });

  it('requires a known NC Medicaid payer id', () => {
    expect(shouldUseNctracks({ ...ncMedicaidInput, payerId: 'MEDICARE_NC' })).toBe(false);
  });

  it('requires a real Medicaid/member id', () => {
    expect(shouldUseNctracks({ ...ncMedicaidInput, medicaidId: undefined })).toBe(false);
    expect(shouldUseNctracks({ ...ncMedicaidInput, medicaidId: 'UNKNOWN' })).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks(ncMedicaidInput)).toBe(false);
  });
});

describe('lookupNctracks', () => {
  it('returns active coverage for standard Medicaid IDs', async () => {
    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100001',
      patientFirstName: 'Jane',
      patientLastName: 'Doe',
    });
    expect(result.active).toBe(true);
    expect(result.source).toBe('nctracks_270_271');
    expect(result.raw.source).toBe('nctracks');
    expect(result.raw.mode).toBe('stub');
  });

  it('rejects placeholder member IDs before they reach the adapter', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'UNKNOWN',
    })).rejects.toThrow('real Medicaid/member ID');
  });

  it('returns inactive for IDs ending in 9', async () => {
    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100009',
    });
    expect(result.active).toBe(false);
  });
});