import { isValidNctracksRecipientId, lookupNctracks, shouldUseNctracks } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid payer context to NCTracks by default', () => {
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA', 'NCXIX', 'medicaid')).toBe(false);
  });

  it('skips NC commercial payer context', () => {
    expect(shouldUseNctracks('NC', 'BCBSNC', 'commercial')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(false);
    delete process.env.NCTRACKS_MODE;
  });
});

describe('isValidNctracksRecipientId', () => {
  it('rejects placeholders and UUIDs before adapter calls', () => {
    expect(isValidNctracksRecipientId(undefined)).toBe(false);
    expect(isValidNctracksRecipientId('UNKNOWN')).toBe(false);
    expect(isValidNctracksRecipientId('10000000-0000-0000-0000-000000000001')).toBe(false);
  });

  it('accepts NC Medicaid-style recipient IDs', () => {
    expect(isValidNctracksRecipientId('NCMD00100001')).toBe(true);
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

  it('fails closed instead of sending UNKNOWN recipient IDs', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
    })).rejects.toThrow('real NC Medicaid recipient ID');
  });
});