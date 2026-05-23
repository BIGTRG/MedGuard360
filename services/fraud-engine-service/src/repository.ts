/**
 * Fraud-engine repository.
 *
 * Covers both the fraud_scores table (one per claim, idempotent upsert) and the
 * fraud_cases table (investigation workqueue, one row per human-reviewable event).
 *
 * Pool queries run with no RLS context because this module is invoked from the
 * Kafka consumer (no JWT available).  Routes that serve investigator UI use
 * withRlsContext() directly so RLS policies apply.
 */

import { pool, query, NotFoundError } from '@medguard360/shared';
import { FraudCase, FraudScoreRow } from './types';

// ─── Fraud Scores ──────────────────────────────────────────────────────────────

export interface ScoreInsert {
  claim_id: string;
  state_code: string;
  score: number;
  recommendation: 'auto_pay' | 'route_to_review' | 'auto_block';
  flags: unknown[];
  explanation: string;
  engine_version: string;
}

/**
 * Upsert a fraud_score row — idempotent on Kafka redelivery.
 */
export async function persistScore(s: ScoreInsert): Promise<FraudScoreRow> {
  const r = await pool.query<FraudScoreRow>(
    `INSERT INTO fraud_scores (claim_id, state_code, score, recommendation, flags, explanation, engine_version)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
     ON CONFLICT (claim_id) DO UPDATE
       SET score            = EXCLUDED.score,
           recommendation   = EXCLUDED.recommendation,
           flags            = EXCLUDED.flags,
           explanation      = EXCLUDED.explanation,
           engine_version   = EXCLUDED.engine_version
     RETURNING *`,
    [
      s.claim_id, s.state_code, s.score, s.recommendation,
      JSON.stringify(s.flags), s.explanation, s.engine_version,
    ],
  );
  return r.rows[0];
}

// ─── Claim Updates ────────────────────────────────────────────────────────────

/**
 * Write risk score + recommendation back to the claims row so billing can read it.
 */
export async function updateClaimWithScore(
  claimId: string, score: number, recommendation: string,
): Promise<void> {
  await pool.query(
    `UPDATE claims
        SET fraud_score          = $2,
            fraud_recommendation = $3,
            status               = CASE
              WHEN $3 IN ('auto_block','route_to_review') THEN 'fraud_review'
              ELSE status
            END,
            updated_at = NOW()
      WHERE id = $1`,
    [claimId, score, recommendation],
  );
}

/**
 * Update claim status explicitly (e.g. 'accepted' when score is below auto_pay_below).
 */
export async function updateClaimStatus(claimId: string, status: string): Promise<void> {
  await pool.query(
    `UPDATE claims SET status = $2, updated_at = NOW() WHERE id = $1`,
    [claimId, status],
  );
}

/**
 * Persist fraud_score + flags to claims table.
 */
export async function updateClaimFraudScore(
  claimId: string, score: number, flags: string[],
): Promise<void> {
  await pool.query(
    `UPDATE claims
        SET fraud_score = $2,
            fraud_flags = $3,
            updated_at  = NOW()
      WHERE id = $1`,
    [claimId, score, flags],
  );
}

// ─── Fraud Cases ──────────────────────────────────────────────────────────────

/**
 * Open a new investigation case.
 */
export async function createFraudCase(
  data: Omit<FraudCase, 'id' | 'created_at' | 'updated_at'>,
): Promise<FraudCase> {
  const r = await pool.query<FraudCase>(
    `INSERT INTO fraud_cases (
       claim_id, provider_user_id, patient_id, state_code,
       risk_score, risk_level, flags, recommendation, ai_explanation,
       status, assigned_to, ai_engine_unavailable, resolved_at, resolution_notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      data.claim_id,
      data.provider_user_id,
      data.patient_id,
      data.state_code,
      data.risk_score   ?? null,
      data.risk_level   ?? null,
      data.flags,
      data.recommendation   ?? null,
      data.ai_explanation   ?? null,
      data.status,
      data.assigned_to      ?? null,
      data.ai_engine_unavailable,
      data.resolved_at      ?? null,
      data.resolution_notes ?? null,
    ],
  );
  return r.rows[0];
}

export interface ListFraudCasesFilters {
  status?: string;
  stateCode?: string;
  riskLevel?: string;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Paginated list of fraud cases sorted by risk_score DESC.
 */
export async function listFraudCases(
  filters: ListFraudCasesFilters,
): Promise<{ cases: FraudCase[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const push = (clause: string, val: unknown): void => {
    params.push(val);
    conditions.push(clause.replace('$$', `$${params.length}`));
  };

  if (filters.status)     push('status = $$',             filters.status);
  if (filters.stateCode)  push('state_code = $$',         filters.stateCode);
  if (filters.riskLevel)  push('risk_level = $$',         filters.riskLevel);
  if (filters.assignedTo) push('assigned_to = $$::uuid',  filters.assignedTo);

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit  = Math.min(filters.limit  ?? 50, 200);
  const offset = filters.offset ?? 0;

  const [countRes, rowsRes] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM fraud_cases ${where}`, params,
    ),
    pool.query<FraudCase>(
      `SELECT * FROM fraud_cases ${where}
       ORDER BY risk_score DESC NULLS LAST
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    ),
  ]);

  return {
    cases: rowsRes.rows,
    total: Number.parseInt(countRes.rows[0].total, 10),
  };
}

/**
 * Fetch a single case by PK.  Returns null when not found.
 */
export async function getFraudCase(id: string): Promise<FraudCase | null> {
  const r = await pool.query<FraudCase>(
    'SELECT * FROM fraud_cases WHERE id = $1', [id],
  );
  return r.rows[0] ?? null;
}

/**
 * Investigator closes out a case with a final determination.
 */
export async function resolveCase(
  id: string,
  investigatorId: string,
  status: 'cleared' | 'confirmed_fraud',
  notes: string,
): Promise<FraudCase> {
  const r = await pool.query<FraudCase>(
    `UPDATE fraud_cases
        SET status           = $2,
            resolution_notes = $3,
            resolved_at      = NOW(),
            assigned_to      = $4,
            updated_at       = NOW()
      WHERE id = $1
      RETURNING *`,
    [id, status, notes, investigatorId],
  );
  if (!r.rows[0]) throw new NotFoundError('FraudCase');
  return r.rows[0];
}

/**
 * Escalate a case to an external Program Integrity counterparty (OCPI in NC,
 * MFCU, CMS UPIC, state OIG). Sets the escalation columns; does NOT resolve
 * the case — status moves to 'under_review' if still 'open' but otherwise
 * stays where it is. Investigator may still resolve afterwards via resolveCase.
 *
 * Allowed targets are constrained by a DB check (migration 0022) — invalid
 * values surface as a 500 with the constraint name, which the route maps to
 * a 400.
 */
export async function escalateCase(
  id: string,
  investigatorId: string,
  target: 'OCPI' | 'MFCU' | 'CMS_UPIC' | 'STATE_OIG',
  notes: string,
): Promise<FraudCase> {
  const r = await pool.query<FraudCase>(
    `UPDATE fraud_cases
        SET escalated_at      = NOW(),
            escalated_by      = $2,
            escalation_target = $3,
            escalation_notes  = $4,
            status            = CASE WHEN status = 'open' THEN 'under_review' ELSE status END,
            updated_at        = NOW()
      WHERE id = $1
      RETURNING *`,
    [id, investigatorId, target, notes],
  );
  if (!r.rows[0]) throw new NotFoundError('FraudCase');
  return r.rows[0];
}

/**
 * Assign a case to an investigator and transition open→under_review.
 */
export async function assignCase(id: string, investigatorId: string): Promise<FraudCase> {
  const r = await pool.query<FraudCase>(
    `UPDATE fraud_cases
        SET assigned_to = $2,
            status      = CASE WHEN status = 'open' THEN 'under_review' ELSE status END,
            updated_at  = NOW()
      WHERE id = $1
      RETURNING *`,
    [id, investigatorId],
  );
  if (!r.rows[0]) throw new NotFoundError('FraudCase');
  return r.rows[0];
}

// ─── Legacy helpers (used by original consumer.ts) ───────────────────────────

/**
 * Backwards-compat shim: open a minimal case row when no rich data is available.
 * Prefer createFraudCase() in new code.
 */
export async function openCaseIfNeeded(
  claimId: string, stateCode: string, recommendation: string,
): Promise<string | null> {
  if (recommendation === 'auto_pay') return null;
  const r = await pool.query<{ id: string }>(
    `INSERT INTO fraud_cases
       (claim_id, state_code, status, provider_user_id, patient_id)
     VALUES ($1,$2,'open',
       (SELECT billing_provider_id FROM claims WHERE id = $1),
       (SELECT patient_id          FROM claims WHERE id = $1))
     RETURNING id`,
    [claimId, stateCode],
  );
  return r.rows[0]?.id ?? null;
}
