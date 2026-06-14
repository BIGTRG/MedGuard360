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
import { FraudCase, FraudScoreRow, scoreToRiskLevel } from './types';

interface FraudCaseDbRow {
  id: string;
  claim_id: string;
  state_code: string;
  status: string;
  opened_at: Date;
  assigned_investigator: string | null;
  resolution: string | null;
  resolved_at: Date | null;
  resolved_by: string | null;
  created_at: Date;
  updated_at: Date;
  escalated_at: Date | null;
  escalated_by: string | null;
  escalation_target: FraudCase['escalation_target'];
  escalation_notes: string | null;
  risk_score: number | null;
  recommendation: string | null;
  ai_explanation: string | null;
  flags: unknown;
  provider_user_id: string | null;
  patient_id: string | null;
}

const CASE_SELECT = `
  SELECT fc.id, fc.claim_id, fc.state_code, fc.status, fc.opened_at,
         fc.assigned_investigator, fc.resolution, fc.resolved_at, fc.resolved_by,
         fc.created_at, fc.updated_at, fc.escalated_at, fc.escalated_by,
         fc.escalation_target, fc.escalation_notes,
         fs.score AS risk_score, fs.recommendation, fs.explanation AS ai_explanation,
         fs.flags, c.billing_provider_id AS provider_user_id, c.patient_id
    FROM fraud_cases fc
    LEFT JOIN fraud_scores fs ON fs.claim_id = fc.claim_id
    LEFT JOIN claims c ON c.id = fc.claim_id`;

function mapFraudCase(row: FraudCaseDbRow): FraudCase {
  const flagsRaw = row.flags;
  const flags = Array.isArray(flagsRaw)
    ? flagsRaw.map(f => (typeof f === 'string' ? f : JSON.stringify(f)))
    : [];
  const score = row.risk_score;
  return {
    id: row.id,
    claim_id: row.claim_id,
    provider_user_id: row.provider_user_id ?? '',
    patient_id: row.patient_id ?? '',
    state_code: row.state_code,
    risk_score: score,
    risk_level: score == null ? null : scoreToRiskLevel(score),
    flags,
    recommendation: row.recommendation,
    ai_explanation: row.ai_explanation,
    status: row.status,
    assigned_to: row.assigned_investigator,
    ai_engine_unavailable: false,
    resolved_at: row.resolved_at,
    resolution_notes: row.resolution,
    escalated_at: row.escalated_at,
    escalated_by: row.escalated_by,
    escalation_target: row.escalation_target,
    escalation_notes: row.escalation_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

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
  const r = await pool.query<{ id: string }>(
    `INSERT INTO fraud_cases (claim_id, state_code, status, assigned_investigator)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [data.claim_id, data.state_code, data.status, data.assigned_to ?? null],
  );
  const created = await getFraudCase(r.rows[0].id);
  if (!created) throw new NotFoundError('FraudCase');
  return created;
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

  if (filters.status)     push('fc.status = $$',             filters.status);
  if (filters.stateCode)  push('fc.state_code = $$',         filters.stateCode);
  if (filters.assignedTo) push('fc.assigned_investigator = $$::uuid', filters.assignedTo);

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit  = Math.min(filters.limit  ?? 50, 200);
  const offset = filters.offset ?? 0;

  const [countRes, rowsRes] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM fraud_cases fc ${where}`, params,
    ),
    pool.query<FraudCaseDbRow>(
      `${CASE_SELECT} ${where}
       ORDER BY fs.score DESC NULLS LAST, fc.opened_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    ),
  ]);

  return {
    cases: rowsRes.rows.map(mapFraudCase),
    total: Number.parseInt(countRes.rows[0].total, 10),
  };
}

/**
 * Fetch a single case by PK.  Returns null when not found.
 */
export async function getFraudCase(id: string): Promise<FraudCase | null> {
  const r = await pool.query<FraudCaseDbRow>(
    `${CASE_SELECT} WHERE fc.id = $1`, [id],
  );
  return r.rows[0] ? mapFraudCase(r.rows[0]) : null;
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
  const r = await pool.query<{ id: string }>(
    `UPDATE fraud_cases
        SET status           = $2,
            resolution       = $3,
            resolved_at      = NOW(),
            resolved_by      = $4,
            assigned_investigator = COALESCE(assigned_investigator, $4),
            updated_at       = NOW()
      WHERE id = $1
      RETURNING id`,
    [id, status, notes, investigatorId],
  );
  if (!r.rows[0]) throw new NotFoundError('FraudCase');
  // Append timeline event — best-effort, don't fail the resolve if logging fails
  await recordEvent({
    caseId: id, actorUserId: investigatorId, eventType: 'resolve',
    text: `Resolved as ${status}: ${notes}`,
    context: { status, notes_length: notes.length },
  }).catch(() => undefined);
  const resolved = await getFraudCase(id);
  if (!resolved) throw new NotFoundError('FraudCase');
  return resolved;
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
  const r = await pool.query<{ id: string }>(
    `UPDATE fraud_cases
        SET escalated_at      = NOW(),
            escalated_by      = $2,
            escalation_target = $3,
            escalation_notes  = $4,
            status            = CASE WHEN status = 'open' THEN 'investigating' ELSE status END,
            updated_at        = NOW()
      WHERE id = $1
      RETURNING id`,
    [id, investigatorId, target, notes],
  );
  if (!r.rows[0]) throw new NotFoundError('FraudCase');
  await recordEvent({
    caseId: id, actorUserId: investigatorId, eventType: 'escalate',
    text: `Escalated to ${target}: ${notes}`,
    context: { target, notes_length: notes.length },
  }).catch(() => undefined);
  const escalated = await getFraudCase(id);
  if (!escalated) throw new NotFoundError('FraudCase');
  return escalated;
}

/**
 * Assign a case to an investigator and transition open→under_review.
 */
export async function assignCase(id: string, investigatorId: string): Promise<FraudCase> {
  const r = await pool.query<{ id: string }>(
    `UPDATE fraud_cases
        SET assigned_investigator = $2,
            status      = CASE WHEN status = 'open' THEN 'investigating' ELSE status END,
            updated_at  = NOW()
      WHERE id = $1
      RETURNING id`,
    [id, investigatorId],
  );
  if (!r.rows[0]) throw new NotFoundError('FraudCase');
  await recordEvent({
    caseId: id, actorUserId: investigatorId, eventType: 'assign',
    text: `Assigned to investigator ${investigatorId.slice(0, 8)}…`,
    context: { to_user_id: investigatorId },
  }).catch(() => undefined);
  const assigned = await getFraudCase(id);
  if (!assigned) throw new NotFoundError('FraudCase');
  return assigned;
}

// ─── Legacy helpers (used by original consumer.ts) ───────────────────────────

// ─── fraud_case_events (append-only timeline) ───────────────────────────────

export type FraudCaseEventType = 'note' | 'review' | 'assign' | 'escalate' | 'resolve' | 'system';

export interface FraudCaseEventRow {
  id: string;
  case_id: string;
  occurred_at: Date | string;
  actor_user_id: string | null;
  event_type: FraudCaseEventType;
  text: string;
  context: Record<string, unknown>;
}

export interface RecordEventInput {
  caseId:       string;
  actorUserId:  string | null;
  eventType:    FraudCaseEventType;
  text:         string;
  context?:     Record<string, unknown>;
}

/**
 * Append one event to fraud_case_events. The table has DB triggers blocking
 * UPDATE/DELETE — callers must NEVER attempt to rewrite history.
 */
export async function recordEvent(input: RecordEventInput): Promise<FraudCaseEventRow> {
  const r = await pool.query<FraudCaseEventRow>(
    `INSERT INTO fraud_case_events (case_id, actor_user_id, event_type, text, context)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [input.caseId, input.actorUserId, input.eventType, input.text, JSON.stringify(input.context ?? {})],
  );
  return r.rows[0];
}

/**
 * List all events for one case, ordered by occurred_at ASC (oldest first —
 * frontend renders chronologically). Limited to 500 entries; if a case ever
 * exceeds that we want to paginate, which today's UI doesn't need.
 */
export async function listEvents(caseId: string): Promise<FraudCaseEventRow[]> {
  const r = await pool.query<FraudCaseEventRow>(
    `SELECT * FROM fraud_case_events
      WHERE case_id = $1
      ORDER BY occurred_at ASC
      LIMIT 500`,
    [caseId],
  );
  return r.rows;
}

/**
 * Backwards-compat shim: open a minimal case row when no rich data is available.
 * Prefer createFraudCase() in new code.
 */
export async function openCaseIfNeeded(
  claimId: string, stateCode: string, recommendation: string,
): Promise<string | null> {
  if (recommendation === 'auto_pay') return null;
  const r = await pool.query<{ id: string }>(
    `INSERT INTO fraud_cases (claim_id, state_code, status)
     VALUES ($1, $2, 'open')
     RETURNING id`,
    [claimId, stateCode],
  );
  return r.rows[0]?.id ?? null;
}
