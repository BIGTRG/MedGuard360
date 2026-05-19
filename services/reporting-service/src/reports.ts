/**
 * Report builders. Each kind reads from Postgres + assembles the output.
 *
 * Production deployments split heavy reports off into a worker queue
 * (Bull/BullMQ or pg-boss). For now we run inline.
 */

import { query, AuthClaims, withRlsContext } from '@medguard360/shared';

export interface ReportResult {
  rowsCount: number;
  data: unknown;
}

/**
 * PERM (Payment Error Rate Measurement) summary — CMS submission ready.
 * Aggregates claim error / fraud / overpayment data for the state.
 */
export async function buildPermReport(auth: AuthClaims, stateCode: string, from: Date, to: Date): Promise<ReportResult> {
  return withRlsContext(auth, async (client) => {
    const summary = await client.query<{
      total_claims: string; total_paid: string; total_denied: string;
      total_fraud_held: string; total_paid_cents: string;
    }>(
      `SELECT
         COUNT(*)                                                                       AS total_claims,
         COUNT(*) FILTER (WHERE status = 'paid')                                        AS total_paid,
         COUNT(*) FILTER (WHERE status = 'denied')                                      AS total_denied,
         COUNT(*) FILTER (WHERE status = 'fraud_review' OR fraud_recommendation = 'auto_block') AS total_fraud_held,
         COALESCE(SUM(total_charge_cents) FILTER (WHERE status = 'paid')::bigint, 0)    AS total_paid_cents
         FROM claims
        WHERE state_code = $1 AND created_at >= $2 AND created_at <= $3`,
      [stateCode, from, to],
    );
    const reasons = await client.query<{ code: string; cnt: string }>(
      `SELECT carc_code AS code, COUNT(*)::text AS cnt
         FROM denials d
        WHERE d.state_code = $1 AND d.remit_received_at BETWEEN $2 AND $3
        GROUP BY carc_code ORDER BY COUNT(*) DESC LIMIT 25`,
      [stateCode, from, to],
    );
    return {
      rowsCount: 1,
      data: {
        state_code: stateCode,
        period: { from: from.toISOString(), to: to.toISOString() },
        summary: summary.rows[0],
        top_denial_reasons: reasons.rows,
        prepared_by: auth.sub,
        prepared_at: new Date().toISOString(),
        format: 'cms-perm-v1',
      },
    };
  });
}

export async function buildFraudSummary(auth: AuthClaims, stateCode: string, from: Date, to: Date): Promise<ReportResult> {
  return withRlsContext(auth, async (client) => {
    const buckets = await client.query<{ rec: string; cnt: string; avg_score: string }>(
      `SELECT recommendation AS rec, COUNT(*)::text AS cnt, COALESCE(AVG(score)::text, '0') AS avg_score
         FROM fraud_scores
        WHERE state_code = $1 AND created_at BETWEEN $2 AND $3
        GROUP BY recommendation`,
      [stateCode, from, to],
    );
    const cases = await client.query<{ status: string; cnt: string }>(
      `SELECT status, COUNT(*)::text AS cnt FROM fraud_cases
        WHERE state_code = $1 AND opened_at BETWEEN $2 AND $3
        GROUP BY status`,
      [stateCode, from, to],
    );
    return { rowsCount: buckets.rows.length, data: { scores_by_recommendation: buckets.rows, cases_by_status: cases.rows } };
  });
}

export async function buildClaimsVolume(auth: AuthClaims, stateCode: string, from: Date, to: Date): Promise<ReportResult> {
  return withRlsContext(auth, async (client) => {
    const daily = await client.query<{ day: string; submitted: string; paid: string; denied: string }>(
      `SELECT to_char(date_trunc('day', submitted_at), 'YYYY-MM-DD') AS day,
              COUNT(*)::text AS submitted,
              COUNT(*) FILTER (WHERE status = 'paid')::text AS paid,
              COUNT(*) FILTER (WHERE status = 'denied')::text AS denied
         FROM claims
        WHERE state_code = $1 AND submitted_at BETWEEN $2 AND $3
        GROUP BY 1 ORDER BY 1`,
      [stateCode, from, to],
    );
    return { rowsCount: daily.rows.length, data: { daily: daily.rows } };
  });
}

/** Upserts a daily rollup. Called by the consumer on every relevant event. */
export async function incrementRollup(stateCode: string, metric: string, day: string, delta: number, details: Record<string, unknown> = {}): Promise<void> {
  await query(
    'reporting.incrementRollup',
    `INSERT INTO daily_rollups (state_code, metric, day, value, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (state_code, metric, day) DO UPDATE
       SET value = daily_rollups.value + EXCLUDED.value,
           details = daily_rollups.details || EXCLUDED.details,
           computed_at = now()`,
    [stateCode, metric, day, delta, JSON.stringify(details)],
  );
}
