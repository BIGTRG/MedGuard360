import { lookupNctracks, shouldUseNctracks } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid payers to NCTracks by default', () => {
    expect(shouldUseNctracks('NC', 'NCXIX')).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA', 'NCXIX')).toBe(false);
  });

  it('skips non-Medicaid NC payers', () => {
    expect(shouldUseNctracks('NC', 'BCBS_NC')).toBe(false);
  });

  it('skips commercial coverage even with an NC payer', () => {
    expect(shouldUseNctracks('NC', 'NCXIX', 'commercial')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC', 'NCXIX')).toBe(false);
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

  it('rejects missing NC Medicaid member IDs instead of sending UNKNOWN to the adapter', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
    })).rejects.toThrow('NCTracks eligibility requires an NC Medicaid member ID');
  });

  it('rejects UUID placeholders as NC Medicaid member IDs', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: '11111111-1111-4111-8111-111111111111',
    })).rejects.toThrow('NCTracks eligibility requires a valid NC Medicaid member ID');
  });
});