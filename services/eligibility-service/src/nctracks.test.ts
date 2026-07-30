import { isValidNctracksRecipientId, lookupNctracks, shouldUseNctracks } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC to NCTracks by default', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('requires NC Medicaid payer context when payer details are provided', () => {
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(true);
    expect(shouldUseNctracks('NC', 'NCMEDPAY', 'chip')).toBe(true);
    expect(shouldUseNctracks('NC', 'COMMERCIAL_AETNA', 'commercial')).toBe(false);
    expect(shouldUseNctracks('NC', 'COMMERCIAL_AETNA', 'medicaid')).toBe(false);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC')).toBe(false);
    delete process.env.NCTRACKS_MODE;
  });
});

describe('lookupNctracks', () => {
  it('rejects missing or placeholder recipient IDs before calling NCTracks', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: undefined,
    })).rejects.toThrow('valid NC Medicaid recipient ID');

    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: '00000000-0000-0000-0000-000000000000',
    })).rejects.toThrow('valid NC Medicaid recipient ID');
  });

  it('identifies real NCTracks recipient IDs', () => {
    expect(isValidNctracksRecipientId('NCMD00100001')).toBe(true);
    expect(isValidNctracksRecipientId('UNKNOWN')).toBe(false);
    expect(isValidNctracksRecipientId('00000000-0000-0000-0000-000000000000')).toBe(false);
  });

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
});