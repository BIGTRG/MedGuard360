import { lookupNctracks, shouldUseNctracks } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes known NC Medicaid payers to NCTracks by default', () => {
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(true);
    expect(shouldUseNctracks('NC', 'NCMEDPAY', 'chip')).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA', 'NCXIX', 'medicaid')).toBe(false);
  });

  it('does not route NC commercial or unknown payers through NCTracks', () => {
    expect(shouldUseNctracks('NC', 'COMMERCIALPAYER', 'commercial')).toBe(false);
    expect(shouldUseNctracks('NC', 'COMMERCIALPAYER', 'medicaid')).toBe(false);
    expect(shouldUseNctracks('NC')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(false);
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

  it('rejects missing or placeholder member IDs before calling NCTracks', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
    })).rejects.toThrow('valid NC Medicaid member ID');
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'UNKNOWN',
    })).rejects.toThrow('valid NC Medicaid member ID');
  });

  it('rejects UUID patient IDs as NCTracks member IDs', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: '10000000-0000-4000-8000-000000000001',
    })).rejects.toThrow('valid NC Medicaid member ID');
  });
});