import { lookupNctracks, shouldUseNctracks } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC to NCTracks by default', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('routes NC Medicaid checks with a member ID and NC Medicaid payer', () => {
    expect(shouldUseNctracks('NC', {
      coverageType: 'medicaid',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100001',
    })).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA')).toBe(false);
  });

  it('skips NC Medicare checks so they use the HETS-aware path', () => {
    expect(shouldUseNctracks('NC', {
      coverageType: 'medicare',
      payerId: 'PALMETTO',
      medicaidId: 'NCMD00100001',
    })).toBe(false);
  });

  it('skips NC checks without a Medicaid member ID', () => {
    expect(shouldUseNctracks('NC', {
      coverageType: 'medicaid',
      payerId: 'NCXIX',
      medicaidId: '   ',
    })).toBe(false);
  });

  it('skips NC checks for non-Medicaid payer IDs', () => {
    expect(shouldUseNctracks('NC', {
      coverageType: 'medicaid',
      payerId: 'COMMERCIALPAYER',
      medicaidId: 'NCMD00100001',
    })).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC', {
      coverageType: 'medicaid',
      payerId: 'NCXIX',
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

  it('does not return active coverage when the Medicaid ID is missing', async () => {
    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      patientFirstName: 'Jane',
      patientLastName: 'Doe',
    });
    expect(result.active).toBe(false);
    expect(result.raw.reason).toBe('missing_medicaid_id');
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