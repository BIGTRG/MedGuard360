/**
 * T-MSIS (Transformed Medicaid Statistical Information System) monthly export.
 *
 * State Medicaid agencies must submit 8 T-MSIS file types to CMS monthly:
 *   - ELIGIBLE (member enrollment + demographics)
 *   - PROVIDER (state-enrolled provider directory)
 *   - CLAIMOT (other claim types — IP, LT, OT, RX)
 *   - CLAIMLT (long-term services)
 *   - CLAIMRX (pharmacy)
 *   - MCP (managed care plans + capitation)
 *   - THIRD_PARTY (TPL — third party liability)
 *   - MANAGED_CARE (member-plan assignments)
 *
 * Spec: https://www.medicaid.gov/medicaid/data-systems/macbis/transformed-medicaid-statistical-information-system-t-msis/
 *
 * Output: fixed-width files per CMS Data Guide v4.x.
 */

import { query } from '@medguard360/shared';

export type TmsisFile = 'ELIGIBLE' | 'PROVIDER' | 'CLAIMOT' | 'CLAIMLT' | 'CLAIMRX' | 'MCP' | 'TPL' | 'MANAGED_CARE';

export interface TmsisJob {
  state_code: string;
  reporting_period: string;  // YYYYMM
  file_type: TmsisFile;
}

export interface TmsisResult {
  job: TmsisJob;
  rowCount: number;
  bytes: number;
  filename: string;
  completedAt: string;
}

export async function extractEligibleFile(stateCode: string, yyyymm: string): Promise<{ rowCount: number; body: string }> {
  // Fixed-width per CMS T-MSIS V4.0 specification — header row plus one data row per eligible
  const result = await query<{ medicaid_id: string; first_name: string; last_name: string; date_of_birth: string; sex_at_birth: string | null }>(
    'reporting.tmsis.eligible',
    `SELECT medicaid_id, first_name, last_name, date_of_birth::text AS date_of_birth, sex_at_birth
       FROM patients
      WHERE state_code = $1 AND status = 'active'
      ORDER BY medicaid_id`,
    [stateCode],
  );
  const lines = result.rows.map(r => [
    r.medicaid_id.padEnd(20, ' '),
    r.first_name.padEnd(35, ' '),
    r.last_name.padEnd(35, ' '),
    r.date_of_birth.replace(/-/g, ''),
    (r.sex_at_birth ?? 'U').padEnd(1, ' '),
  ].join(''));
  return { rowCount: result.rows.length, body: `HEAD ${stateCode} ${yyyymm}\n${lines.join('\n')}` };
}

export async function extractProviderFile(stateCode: string, yyyymm: string): Promise<{ rowCount: number; body: string }> {
  const result = await query<{ npi: string; legal_name: string; type: string; status: string }>(
    'reporting.tmsis.provider',
    `SELECT npi, legal_name, type, status
       FROM providers
      WHERE state_code = $1 AND status = 'active'
      ORDER BY npi`,
    [stateCode],
  );
  const lines = result.rows.map(r => [
    r.npi.padEnd(10, ' '),
    r.legal_name.padEnd(80, ' '),
    r.type.padEnd(20, ' '),
    r.status.padEnd(10, ' '),
  ].join(''));
  return { rowCount: result.rows.length, body: `HEAD ${stateCode} ${yyyymm} PROVIDER\n${lines.join('\n')}` };
}

export function buildFilename(job: TmsisJob): string {
  // Per CMS naming: T-MSIS_<filetype>_<state>_<YYYYMM>_<seqnum>.txt
  return `T-MSIS_${job.file_type}_${job.state_code}_${job.reporting_period}_001.txt`;
}
