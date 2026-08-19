import { hasUsableNcRecipientId, lookupNctracks, shouldUseNctracks } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid and CHIP checks to NCTracks', () => {
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(true);
    expect(shouldUseNctracks('NC', 'NC Health Choice', 'chip')).toBe(true);
  });

  it('routes known NC Medicaid payer IDs even without coverage type', () => {
    expect(shouldUseNctracks('NC', 'NCXIX')).toBe(true);
  });

  it('does not route commercial NC payers through NCTracks', () => {
    expect(shouldUseNctracks('NC', 'AETNA-COMMERCIAL', 'commercial')).toBe(false);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA', 'NCXIX', 'medicaid')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    const prev = process.env.NCTRACKS_MODE;
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(false);
    if (prev === undefined) delete process.env.NCTRACKS_MODE;
    else process.env.NCTRACKS_MODE = prev;
  });
});

describe('hasUsableNcRecipientId', () => {
  it('rejects placeholders and patient UUIDs', () => {
    expect(hasUsableNcRecipientId('UNKNOWN')).toBe(false);
    expect(hasUsableNcRecipientId('10000000-0000-4000-8000-000000000001')).toBe(false);
  });

  it('accepts real NC recipient IDs', () => {
    expect(hasUsableNcRecipientId('NCMD00100001')).toBe(true);
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

  it('fails closed when no real NC Medicaid recipient ID is available', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: '10000000-0000-4000-8000-000000000001',
    })).rejects.toThrow('real NC Medicaid recipient ID');
  });
});