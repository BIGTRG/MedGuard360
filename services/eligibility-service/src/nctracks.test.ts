jest.mock('./nctracks-audit', () => ({
  recordEligibilityX12Audit: jest.fn(),
}));

import { assertValidNctracksRecipientId, lookupNctracks, shouldUseNctracks } from './nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid payer checks to NCTracks by default', () => {
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA', 'NCXIX', 'medicaid')).toBe(false);
  });

  it('skips NC commercial payer checks', () => {
    expect(shouldUseNctracks('NC', 'COMMERCIAL', 'commercial')).toBe(false);
    expect(shouldUseNctracks('NC', 'COMMERCIAL', 'medicaid')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    const prev = process.env.NCTRACKS_MODE;
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(false);
    if (prev === undefined) delete process.env.NCTRACKS_MODE;
    else process.env.NCTRACKS_MODE = prev;
  });
});

describe('assertValidNctracksRecipientId', () => {
  it('rejects missing placeholders and patient UUID fallbacks', () => {
    expect(() => assertValidNctracksRecipientId(undefined)).toThrow(/recipient ID/);
    expect(() => assertValidNctracksRecipientId('UNKNOWN')).toThrow(/recipient ID/);
    expect(() => assertValidNctracksRecipientId('00000000-0000-4000-8000-000000000001')).toThrow(/recipient ID/);
  });

  it('returns trimmed real recipient IDs', () => {
    expect(assertValidNctracksRecipientId(' NCMD00100001 ')).toBe('NCMD00100001');
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
});