import { readFileSync } from 'fs';
import path from 'path';
import type { CheckSource } from './types';

describe('eligibility source contract', () => {
  it('allows NCTracks eligibility provenance in TypeScript and PostgreSQL', () => {
    const sources: CheckSource[] = ['mmis_270_271', 'nctracks_270_271'];
    expect(sources).toContain('nctracks_270_271');

    const migration = readFileSync(
      path.resolve(__dirname, '../../../infrastructure/postgres/migrations/0037_allow_nctracks_eligibility_source.sql'),
      'utf8',
    );
    expect(migration).toContain("'nctracks_270_271'");
    expect(migration).toContain('eligibility_checks_source_check');
  });
});
