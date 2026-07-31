import { lookupNctracks, shouldUseNctracks } from './nctracks';
import { readFileSync } from 'fs';
import path from 'path';

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

  it('keeps the persisted source aligned with database constraints', async () => {
    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100001',
    });
    const migrationsRoot = path.resolve(__dirname, '../../../infrastructure/postgres/migrations');
    const baseSchema = readFileSync(path.join(migrationsRoot, '0011_eligibility_schema.sql'), 'utf8');
    const existingDbMigration = readFileSync(
      path.join(migrationsRoot, '0037_nctracks_eligibility_source.sql'),
      'utf8',
    );

    expect(baseSchema).toContain(`'${result.source}'`);
    expect(existingDbMigration).toContain(`'${result.source}'`);
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