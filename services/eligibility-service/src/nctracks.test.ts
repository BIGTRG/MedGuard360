import { lookupNctracks, shouldUseNctracks } from './nctracks';

describe('shouldUseNctracks', () => {
  afterEach(() => {
    delete process.env.NCTRACKS_MODE;
  });

  it('routes NC Medicaid checks to NCTracks when a real member ID is present', () => {
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100001',
    })).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks({
      stateCode: 'GA',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100001',
    })).toBe(false);
  });

  it('skips NC Medicaid checks without a member ID', () => {
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
    })).toBe(false);
  });

  it('skips NC commercial payers', () => {
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'COMMERCIAL',
      coverageType: 'commercial',
      medicaidId: 'NCMD00100001',
    })).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100001',
    })).toBe(false);
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

  it('rejects checks without a Medicaid member ID instead of sending UNKNOWN', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
    })).rejects.toThrow('Medicaid member ID');
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