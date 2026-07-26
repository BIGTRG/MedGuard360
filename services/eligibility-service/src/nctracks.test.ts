import { lookupNctracks, shouldUseNctracks } from './nctracks';
import { lookupMmis } from './mmis';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid payer checks through NCTracks by default', () => {
    expect(shouldUseNctracks('NC', 'NCXIX', 'medicaid')).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA', 'NCXIX', 'medicaid')).toBe(false);
  });

  it('skips NC non-Medicaid payer checks', () => {
    expect(shouldUseNctracks('NC', 'COMMERCIAL-PAYER', 'commercial')).toBe(false);
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

  it('rejects placeholder member IDs before contacting the adapter', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
    })).rejects.toThrow(/real NC Medicaid member ID/);
  });
});

describe('lookupMmis NCTracks fallback behavior', () => {
  const originalMode = process.env.NCTRACKS_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.NCTRACKS_MODE;
    } else {
      process.env.NCTRACKS_MODE = originalMode;
    }
  });

  it('fails closed instead of falling back when authoritative NCTracks is misconfigured', async () => {
    process.env.NCTRACKS_MODE = 'soap';

    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100001',
    }, '')).rejects.toThrow(/NCTRACKS_REALTIME_ELIGIBILITY_URL/);
  });
});
