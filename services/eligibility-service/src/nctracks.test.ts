import { readFileSync } from 'fs';
import { join } from 'path';
import { lookupMmis, NctracksEligibilityError } from './mmis';
import { lookupNctracks, shouldUseNctracks } from './nctracks';
import type { CheckSource } from './types';

describe('shouldUseNctracks', () => {
  it('routes NC to NCTracks by default', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC')).toBe(false);
    delete process.env.NCTRACKS_MODE;
  });

  it('requires NC Medicaid context and a real member ID when evaluating a request', () => {
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100001',
    })).toBe(true);
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'COMMERCIAL_PLAN',
      coverageType: 'commercial',
      medicaidId: 'NCMD00100001',
    })).toBe(false);
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
    })).toBe(false);
    expect(shouldUseNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: '10000000-0000-0000-0000-000000000001',
    })).toBe(false);
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

  it('does not send placeholders to NCTracks when member ID is missing', async () => {
    await expect(lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
    })).rejects.toThrow('requires a real NC Medicaid member ID');
  });
});

describe('lookupMmis NCTracks fallback handling', () => {
  const realModeKeys = [
    'NCTRACKS_MODE',
    'NCTRACKS_REALTIME_ELIGIBILITY_URL',
    'NCTRACKS_CLIENT_CERT',
    'NCTRACKS_CLIENT_KEY',
  ];
  const previousEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of realModeKeys) {
      previousEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of realModeKeys) {
      const previous = previousEnv[key];
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  });

  it('does not fall back to simulated active coverage when NCTracks fails', async () => {
    process.env.NCTRACKS_MODE = 'soap';

    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100001',
    }, '')).rejects.toBeInstanceOf(NctracksEligibilityError);
  });
});

describe('NCTracks eligibility source persistence', () => {
  it('keeps the TypeScript source and PostgreSQL constraints aligned', () => {
    const source: CheckSource = 'nctracks_270_271';
    const baseMigration = readFileSync(
      join(__dirname, '../../../infrastructure/postgres/migrations/0011_eligibility_schema.sql'),
      'utf8',
    );
    const forwardMigration = readFileSync(
      join(__dirname, '../../../infrastructure/postgres/migrations/0037_allow_nctracks_eligibility_source.sql'),
      'utf8',
    );

    expect(source).toBe('nctracks_270_271');
    expect(baseMigration).toContain("'nctracks_270_271'");
    expect(forwardMigration).toContain("'nctracks_270_271'");
  });
});