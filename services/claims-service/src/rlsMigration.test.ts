import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');
const migrationsDir = path.join(repoRoot, 'infrastructure/postgres/migrations');

interface ClaimsPolicyMigration {
  fileName: string;
  policySql: string;
}

function readUtf8TextFile(filePath: string): string {
  const bytes = fs.readFileSync(filePath);
  expect(bytes.includes(0)).toBe(false);
  return bytes.toString('utf8');
}

function claimsReadPolicies(): ClaimsPolicyMigration[] {
  const policyPattern = /CREATE POLICY claims_read ON claims FOR SELECT USING \([\s\S]*?\n\);/g;

  return fs
    .readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort()
    .flatMap((fileName) => {
      const migrationSql = readUtf8TextFile(path.join(migrationsDir, fileName));
      const policySql = migrationSql.match(policyPattern) ?? [];
      return policySql.map((policy) => ({ fileName, policySql: policy }));
    });
}

describe('claims RLS migrations', () => {
  it('keeps SQL migrations normalized as UTF-8 text files', () => {
    const attributes = readUtf8TextFile(path.join(repoRoot, '.gitattributes'));
    expect(attributes.split(/\r?\n/)).toContain('*.sql text eol=lf');

    const fixedMigration = fs.readFileSync(
      path.join(migrationsDir, '0030_fix_claims_provider_rls.sql'),
    );
    expect(fixedMigration.subarray(0, 2).equals(Buffer.from([0xff, 0xfe]))).toBe(false);
    expect(fixedMigration.includes(0)).toBe(false);
  });

  it('preserves provider-profile and patient access in the effective claims_read policy', () => {
    const policies = claimsReadPolicies();
    expect(policies.length).toBeGreaterThan(0);

    const effectivePolicy = policies[policies.length - 1];
    expect(effectivePolicy.fileName).toBe('0035_patient_claims_read.sql');
    expect(effectivePolicy.policySql).toContain(
      'billing_provider_id IN (SELECT id FROM providers WHERE user_id = app_current_user_id())',
    );
    expect(effectivePolicy.policySql).toContain(
      'rendering_provider_id IN (SELECT id FROM providers WHERE user_id = app_current_user_id())',
    );
    expect(effectivePolicy.policySql).toContain(
      "app_current_role() = 'patient' AND patient_id = app_current_user_id()",
    );
    expect(effectivePolicy.policySql).not.toContain('billing_provider_id = app_current_user_id()');
    expect(effectivePolicy.policySql).not.toContain('rendering_provider_id = app_current_user_id()');
  });
});
