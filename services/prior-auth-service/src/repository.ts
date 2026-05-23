import { pool, withRlsContext, NotFoundError } from '@medguard360/shared';
import { PaRequestRow, CriterionEvaluationRow } from './types';

export async function createPaRequest(
  data: Omit<PaRequestRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<PaRequestRow> {
  const result = await pool.query<PaRequestRow>(
    `INSERT INTO pa_requests (
       patient_id, provider_user_id, state_code, payer_id,
       procedure_code, diagnosis_codes, clinical_justification,
       urgency, status, ai_recommendation, ai_confidence, ai_explanation,
       human_reviewer_id, human_decision, human_notes,
       due_at, decided_at, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [
      data.patient_id,
      data.provider_user_id,
      data.state_code,
      data.payer_id,
      data.procedure_code,
      data.diagnosis_codes,
      data.clinical_justification ?? null,
      data.urgency,
      data.status,
      data.ai_recommendation ?? null,
      data.ai_confidence ?? null,
      data.ai_explanation ?? null,
      data.human_reviewer_id ?? null,
      data.human_decision ?? null,
      data.human_notes ?? null,
      data.due_at,
      data.decided_at ?? null,
      data.created_by,
    ],
  );
  return result.rows[0];
}

export async function findPaRequest(id: string): Promise<PaRequestRow | null> {
  const result = await pool.query<PaRequestRow>(
    'SELECT * FROM pa_requests WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

export interface PaListFilters {
  status?: string;
  stateCode?: string;
  providerId?: string;
  limit?: number;
  offset?: number;
}

export async function listPaRequests(filters: PaListFilters): Promise<PaRequestRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filters.stateCode) {
    params.push(filters.stateCode);
    conditions.push(`state_code = $${params.length}`);
  }
  if (filters.providerId) {
    params.push(filters.providerId);
    conditions.push(`provider_user_id = $${params.length}`);
  }

  const limit = Math.min(filters.limit ?? 100, 500);
  const offset = filters.offset ?? 0;
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query<PaRequestRow>(
    `SELECT * FROM pa_requests
     ${where}
     ORDER BY
       CASE urgency WHEN 'drug' THEN 0 WHEN 'expedited' THEN 1 ELSE 2 END,
       due_at ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  return result.rows;
}

export async function updatePaRequest(
  id: string,
  data: Partial<PaRequestRow>,
): Promise<PaRequestRow> {
  const setClauses: string[] = [];
  const params: unknown[] = [id];

  const fields: Array<[keyof Partial<PaRequestRow>, string]> = [
    ['status', 'status'],
    ['ai_recommendation', 'ai_recommendation'],
    ['ai_confidence', 'ai_confidence'],
    ['ai_explanation', 'ai_explanation'],
    ['human_reviewer_id', 'human_reviewer_id'],
    ['human_decision', 'human_decision'],
    ['human_notes', 'human_notes'],
    ['decided_at', 'decided_at'],
  ];

  for (const [key, col] of fields) {
    if (key in data) {
      params.push((data as Record<string, unknown>)[key] ?? null);
      setClauses.push(`${col} = $${params.length}`);
    }
  }

  if (!setClauses.length) {
    const row = await findPaRequest(id);
    if (!row) throw new NotFoundError('PA request');
    return row;
  }

  setClauses.push(`updated_at = now()`);

  const result = await pool.query<PaRequestRow>(
    `UPDATE pa_requests SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  if (!result.rows[0]) throw new NotFoundError('PA request');
  return result.rows[0];
}

export async function saveCriterionEvaluations(
  paRequestId: string,
  evaluations: Omit<CriterionEvaluationRow, 'id' | 'created_at' | 'pa_request_id'>[],
): Promise<void> {
  if (!evaluations.length) return;

  const values: string[] = [];
  const params: unknown[] = [];

  for (const ev of evaluations) {
    const base = params.length;
    params.push(paRequestId, ev.criterion_text, ev.similarity_score ?? null, ev.outcome, ev.explanation ?? null);
    values.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5})`);
  }

  await pool.query(
    `INSERT INTO pa_criterion_evaluations
       (pa_request_id, criterion_text, similarity_score, outcome, explanation)
     VALUES ${values.join(',')}`,
    params,
  );
}

/**
 * Investigator overrides one criterion's outcome. Persists into the
 * human_outcome columns on the same row (migration 0024 added them).
 * Idempotent — repeated calls just overwrite the latest.
 *
 * Returns the updated row, or null if criterionId doesn't exist or isn't
 * attached to the given paRequestId (prevents id-stuffing across PAs).
 */
export async function setCriterionOverride(
  paRequestId: string,
  criterionId: string,
  reviewerUserId: string,
  outcome: 'met' | 'not_met' | 'indeterminate',
): Promise<CriterionEvaluationRow | null> {
  const r = await pool.query<CriterionEvaluationRow>(
    `UPDATE pa_criterion_evaluations
        SET human_outcome     = $3,
            human_outcome_at  = NOW(),
            human_reviewer_id = $4
      WHERE id = $2 AND pa_request_id = $1
      RETURNING *`,
    [paRequestId, criterionId, outcome, reviewerUserId],
  );
  return r.rows[0] ?? null;
}
