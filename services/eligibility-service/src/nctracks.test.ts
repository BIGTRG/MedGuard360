import { lookupNctracks, shouldUseNctracks } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes known NC Medicaid payers to NCTracks by default', () => {
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(true);
    expect(shouldUseNctracks('NC', 'NCMEDPAY', 'chip')).toBe(true);
  });

  it('keeps the state-only poller check enabled for NC', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('does not route commercial or unknown NC payers to NCTracks', () => {
    expect(shouldUseNctracks('NC', 'AETNA_COMMERCIAL', 'commercial')).toBe(false);
    expect(shouldUseNctracks('NC', 'UNKNOWN_PAYER', 'medicaid')).toBe(false);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA', 'NCXIX', 'medicaid')).toBe(false);
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
      coverageType: 'medicaid',
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
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100009',
    });
    expect(result.active).toBe(false);
  });

  it('rejects missing NC Medicaid recipient IDs before calling the adapter', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
    })).rejects.toThrow('real NC Medicaid recipient ID');
  });
});