import { lookupNctracks, shouldUseNctracks } from './nctracks';
import { lookupMmis } from './mmis';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid payer checks to NCTracks by default', () => {
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA', 'NCXIX', 'medicaid')).toBe(false);
  });

  it('skips NC non-Medicaid payers', () => {
    expect(shouldUseNctracks('NC', 'BCBSNC-COMMERCIAL', 'commercial')).toBe(false);
  });

  it('requires a known NC Medicaid payer id', () => {
    expect(shouldUseNctracks('NC', undefined, 'medicaid')).toBe(false);
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

  it('rejects placeholder recipient ids before calling NCTracks', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'UNKNOWN',
    })).rejects.toThrow('real NC Medicaid recipient ID');
  });

  it('rejects patient UUIDs before calling NCTracks', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: '11111111-1111-4111-8111-111111111111',
    })).rejects.toThrow('real NC Medicaid recipient ID');
  });
});

describe('lookupMmis NCTracks fail-closed behavior', () => {
  it('does not fall back to simulator when authoritative NCTracks input is invalid', async () => {
    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: '11111111-1111-4111-8111-111111111111',
    }, '')).rejects.toThrow('real NC Medicaid recipient ID');
  });
});