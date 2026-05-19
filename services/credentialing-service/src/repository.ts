import { withRlsContext, AuthClaims, NotFoundError } from '@medguard360/shared';
import { ApplicationRow, AppType, AppStatus, DocumentRow, PsvRow, PsvStatus, PsvSource } from './types';

function targetDecisionBy(now: Date = new Date()): Date {
  // CLAUDE.md goal: 3–5 day turnaround. We set 5 calendar days as the SLA;
  // a scheduled job can prune past `target_decision_by` to highlight at-risk apps.
  const d = new Date(now);
  d.setDate(d.getDate() + 5);
  return d;
}

export async function createApplication(
  auth: AuthClaims,
  input: { providerId: string; stateCode: string; mcoId?: string; applicationType: AppType },
): Promise<ApplicationRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<ApplicationRow>(
      `INSERT INTO credentialing_applications
         (provider_id, state_code, mco_id, application_type, target_decision_by, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [input.providerId, input.stateCode, input.mcoId ?? null, input.applicationType, targetDecisionBy(), auth.sub],
    );
    return r.rows[0];
  });
}

export interface ListAppsInput {
  status?: AppStatus | AppStatus[];
  stateCode?: string;
  assignedSpecialist?: string;
  limit?: number;
}

export async function listApplications(auth: AuthClaims, input: ListAppsInput): Promise<ApplicationRow[]> {
  return withRlsContext(auth, async (client) => {
    const where: string[] = [];
    const params: unknown[] = [];
    const push = (clause: string, val: unknown): void => { params.push(val); where.push(clause.replace('$$', `$${params.length}`)); };
    if (input.status) {
      const arr = Array.isArray(input.status) ? input.status : [input.status];
      push('status = ANY($$::text[])', arr);
    }
    if (input.stateCode)          push('state_code = $$',          input.stateCode);
    if (input.assignedSpecialist) push('assigned_specialist = $$', input.assignedSpecialist);
    const limit = Math.min(input.limit ?? 200, 1000);
    const r = await client.query<ApplicationRow>(
      `SELECT * FROM credentialing_applications
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY target_decision_by ASC
       LIMIT ${limit}`,
      params,
    );
    return r.rows;
  });
}

export async function getApplication(auth: AuthClaims, id: string): Promise<ApplicationRow & { documents: DocumentRow[]; psvChecks: PsvRow[] }> {
  return withRlsContext(auth, async (client) => {
    const a = await client.query<ApplicationRow>('SELECT * FROM credentialing_applications WHERE id = $1', [id]);
    if (!a.rows[0]) throw new NotFoundError('Application');
    const [d, p] = await Promise.all([
      client.query<DocumentRow>('SELECT * FROM credentialing_documents WHERE application_id = $1 ORDER BY uploaded_at', [id]),
      client.query<PsvRow>('SELECT * FROM psv_checks WHERE application_id = $1 ORDER BY checked_at DESC', [id]),
    ]);
    return { ...a.rows[0], documents: d.rows, psvChecks: p.rows };
  });
}

export async function setStatus(auth: AuthClaims, id: string, status: AppStatus, reason?: string): Promise<ApplicationRow> {
  return withRlsContext(auth, async (client) => {
    const decisionTouch = ['approved','denied','withdrawn','expired'].includes(status);
    const r = await client.query<ApplicationRow>(
      `UPDATE credentialing_applications
         SET status = $2,
             decision_at = CASE WHEN $3 THEN now() ELSE decision_at END,
             decision_reason = COALESCE($4, decision_reason)
       WHERE id = $1 RETURNING *`,
      [id, status, decisionTouch, reason ?? null],
    );
    if (!r.rows[0]) throw new NotFoundError('Application');
    return r.rows[0];
  });
}

export async function insertDocument(auth: AuthClaims, input: {
  applicationId: string; docType: string; mimeType: string;
  bucket: string; objectKey: string; sizeBytes: number; sha256: string;
}): Promise<DocumentRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<DocumentRow>(
      `INSERT INTO credentialing_documents
         (application_id, doc_type, mime_type, minio_bucket, minio_object_key, size_bytes, sha256, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [input.applicationId, input.docType, input.mimeType,
       input.bucket, input.objectKey, input.sizeBytes, input.sha256, auth.sub],
    );
    return r.rows[0];
  });
}

export async function attachOcrResults(auth: AuthClaims, docId: string, payload: {
  text: string; classifiedAs: string; classificationConfidence: number;
  extractedFields: unknown; engineVersion: string;
}): Promise<void> {
  await withRlsContext(auth, async (client) => {
    await client.query(
      `UPDATE credentialing_documents
         SET ocr_text = $2,
             ocr_classified_as = $3,
             ocr_classification_confidence = $4,
             extracted_fields = $5::jsonb,
             ocr_engine_version = $6
       WHERE id = $1`,
      [docId, payload.text, payload.classifiedAs, payload.classificationConfidence,
       JSON.stringify(payload.extractedFields), payload.engineVersion],
    );
  });
}

export async function insertPsvResult(auth: AuthClaims, input: {
  applicationId: string; source: PsvSource; status: PsvStatus;
  resultSummary: string; sourceReference?: string; rawResponse?: unknown; expiresAt?: Date;
}): Promise<PsvRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<PsvRow>(
      `INSERT INTO psv_checks
         (application_id, source, status, result_summary, source_reference, raw_response, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,
      [input.applicationId, input.source, input.status, input.resultSummary,
       input.sourceReference ?? null, JSON.stringify(input.rawResponse ?? {}), input.expiresAt ?? null],
    );
    return r.rows[0];
  });
}

export async function issueCredential(auth: AuthClaims, input: {
  providerId: string; stateCode: string; mcoId?: string; applicationId: string;
  effectiveFrom: string; expiresAt: string;
}): Promise<void> {
  await withRlsContext(auth, async (client) => {
    await client.query(
      `INSERT INTO credentials (provider_id, state_code, mco_id, application_id, effective_from, expires_at, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (provider_id, state_code, mco_id) DO UPDATE
         SET application_id = EXCLUDED.application_id,
             effective_from = EXCLUDED.effective_from,
             expires_at = EXCLUDED.expires_at,
             status = 'active'`,
      [input.providerId, input.stateCode, input.mcoId ?? null, input.applicationId,
       input.effectiveFrom, input.expiresAt, auth.sub],
    );
  });
}
