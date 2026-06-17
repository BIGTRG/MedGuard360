import { pool, withRlsContext, NotFoundError } from '@medguard360/shared';
import { PaRequestRow, CriterionEvaluationRow } from './types';

/** Map DB row (migration 0004 shape) to API row expected by routes + portals. */
function mapPaRow(row: Record<string, unknown>): PaRequestRow {
  const status = String(row.status ?? '');
  const decisionAt = (row.decision_at ?? row.decided_at ?? null) as Date | null;
  const explanation = (row.decision_explanation ?? row.ai_explanation ?? null) as string | null;
  const decided = decisionAt != null;

  return {
    id: row.id as string,
    patient_id: row.patient_id as string,
    provider_user_id: (row.ordering_provider_id ?? row.provider_user_id) as string,
    state_code: row.state_code as string,
    payer_id: row.payer_id as string,
    procedure_code: (row.service_code ?? row.procedure_code) as string,
    diagnosis_codes: (row.diagnosis_codes as string[]) ?? [],
    clinical_justification: (row.clinical_justification as string | null) ?? null,
    urgency: row.urgency as PaRequestRow['urgency'],
    status: status as PaRequestRow['status'],
    ai_recommendation: (row.ai_recommendation as string | null) ?? null,
    ai_confidence: row.ai_match_score != null ? Number(row.ai_match_score) : (row.ai_confidence as number | null) ?? null,
    ai_explanation: explanation,
    human_reviewer_id: (row.human_reviewer_id as string | null) ?? null,
    human_decision: decided && ['approved', 'denied', 'needs_more_info'].includes(status) ? status : null,
    human_notes: decided ? explanation : null,
    due_at: row.due_at as Date,
    decided_at: decisionAt,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    created_by: row.created_by as string,
    // Aliases consumed directly by portals (see pa-queue evidence page).
    ...(row.service_code ? { service_code: row.service_code as string } : {}),
    ...(row.ordering_provider_id ? { ordering_provider_id: row.ordering_provider_id as string } : {}),
    ...(row.decision_at ? { decision_at: row.decision_at as Date } : {}),
    ...(row.decision_explanation ? { decision_explanation: row.decision_explanation as string } : {}),
    ...(row.ai_match_score != null ? { ai_match_score: row.ai_match_score as string | number } : {}),
    ...(row.ai_engine_version ? { ai_engine_version: row.ai_engine_version as string } : {}),
  } as PaRequestRow;
}

export async function createPaRequest(
  data: Omit<PaRequestRow, 'id' | 'created_at' | 'updated_at'> & {
    service_code_type?: string;
    service_description?: string;
    clinical_doc_id?: string | null;
  },
): Promise<PaRequestRow> {
  const result = await pool.query(
    `INSERT INTO pa_requests (
       patient_id, ordering_provider_id, payer_id, state_code,
       service_code, service_code_type, service_description,
       diagnosis_codes, urgency, status, clinical_doc_id, due_at, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      data.patient_id,
      data.provider_user_id,
      data.payer_id,
      data.state_code,
      data.procedure_code,
      data.service_code_type ?? 'CPT',
      data.service_description ?? data.procedure_code,
      data.diagnosis_codes,
      data.urgency,
      data.status === 'pending' ? 'received' : data.status,
      data.clinical_doc_id ?? null,
      data.due_at,
      data.created_by,
    ],
  );
  return mapPaRow(result.rows[0] as unknown as Record<string, unknown>);
}

export async function findPaRequest(id: string): Promise<PaRequestRow | null> {
  const result = await pool.query(
    'SELECT * FROM pa_requests WHERE id = $1',
    [id],
  );
  return result.rows[0] ? mapPaRow(result.rows[0] as Record<string, unknown>) : null;
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
    conditions.push(`ordering_provider_id = $${params.length}`);
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
  return result.rows.map(r => mapPaRow(r as unknown as Record<string, unknown>));
}

export async function updatePaRequest(
  id: string,
  data: Partial<PaRequestRow>,
): Promise<PaRequestRow> {
  const setClauses: string[] = [];
  const params: unknown[] = [id];

  const fields: Array<[keyof Partial<PaRequestRow>, string]> = [
    ['status', 'status'],
    ['ai_confidence', 'ai_match_score'],
    ['ai_explanation', 'decision_explanation'],
    ['human_reviewer_id', 'human_reviewer_id'],
    ['human_notes', 'decision_explanation'],
    ['decided_at', 'decision_at'],
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
  return mapPaRow(result.rows[0] as unknown as Record<string, unknown>);
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
