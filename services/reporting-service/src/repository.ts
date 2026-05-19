import { withRlsContext, AuthClaims, NotFoundError, query } from '@medguard360/shared';

export interface ReportJobRow {
  id: string;
  state_code: string;
  kind: 'perm' | 'fraud_summary' | 'claims_volume' | 'denial_pattern' | 'custom';
  status: 'queued' | 'running' | 'complete' | 'failed';
  parameters: Record<string, unknown>;
  result: unknown | null;
  rows_count: number | null;
  error: string | null;
}

export async function createJob(auth: AuthClaims, stateCode: string, kind: ReportJobRow['kind'], parameters: Record<string, unknown>): Promise<ReportJobRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<ReportJobRow>(
      `INSERT INTO report_jobs (state_code, kind, requested_by, parameters)
       VALUES ($1, $2, $3, $4::jsonb) RETURNING *`,
      [stateCode, kind, auth.sub, JSON.stringify(parameters)],
    );
    return r.rows[0];
  });
}

export async function completeJob(jobId: string, result: unknown, rowsCount: number): Promise<void> {
  await query(
    'reporting.completeJob',
    `UPDATE report_jobs
       SET status = 'complete', result = $2::jsonb, rows_count = $3, completed_at = now()
     WHERE id = $1`,
    [jobId, JSON.stringify(result), rowsCount],
  );
}

export async function failJob(jobId: string, err: string): Promise<void> {
  await query('reporting.failJob',
    `UPDATE report_jobs SET status = 'failed', error = $2, completed_at = now() WHERE id = $1`,
    [jobId, err]);
}

export async function getJob(auth: AuthClaims, id: string): Promise<ReportJobRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<ReportJobRow>('SELECT * FROM report_jobs WHERE id = $1', [id]);
    if (!r.rows[0]) throw new NotFoundError('Report job');
    return r.rows[0];
  });
}

export interface RollupRow {
  state_code: string;
  metric: string;
  day: string;
  value: string;
}

export async function getRollups(auth: AuthClaims, stateCode: string, metric: string, fromDay: string, toDay: string): Promise<RollupRow[]> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<RollupRow>(
      `SELECT state_code, metric, day::text, value::text
         FROM daily_rollups
        WHERE state_code = $1 AND metric = $2 AND day BETWEEN $3 AND $4
        ORDER BY day`,
      [stateCode, metric, fromDay, toDay],
    );
    return r.rows;
  });
}
