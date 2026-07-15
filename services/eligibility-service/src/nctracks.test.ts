import { lookupNctracks, shouldUseNctracks } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid checks with member IDs to NCTracks by default', () => {
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

  it('requires a Medicaid member ID', () => {
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
    })).toBe(false);
  });

  it('skips NC non-Medicaid coverage', () => {
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'AETNA_COMMERCIAL',
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
    delete process.env.NCTRACKS_MODE;
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

  it('returns inactive for IDs ending in 9', async () => {
    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100009',
    });
    expect(result.active).toBe(false);
  });

  it('rejects missing member IDs instead of querying NCTracks with UNKNOWN', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
    })).rejects.toThrow('NCTracks eligibility requires a Medicaid member ID');
  });
});
