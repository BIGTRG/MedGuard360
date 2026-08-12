import { lookupNctracks, shouldUseNctracks } from './nctracks';
import { lookupMmis } from './mmis';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid and CHIP checks to NCTracks', () => {
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(true);
    expect(shouldUseNctracks('NC', 'NCCHIP', 'chip')).toBe(true);
  });

  it('skips non-NC states and non-Medicaid NC payers', () => {
    expect(shouldUseNctracks('GA', 'NCXIX', 'medicaid')).toBe(false);
    expect(shouldUseNctracks('NC', 'COMMERCIAL', 'commercial')).toBe(false);
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

  it('rejects missing or placeholder recipient IDs before calling the adapter', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
    })).rejects.toThrow('real NC Medicaid recipient ID');

    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'UNKNOWN',
    })).rejects.toThrow('real NC Medicaid recipient ID');
  });
});

describe('lookupMmis NCTracks fail-closed behavior', () => {
  it('does not fall back to generic MMIS when NCTracks-required input is invalid', async () => {
    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'UNKNOWN',
    }, '')).rejects.toThrow('real NC Medicaid recipient ID');
  });
});