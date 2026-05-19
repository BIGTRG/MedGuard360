import { withRlsContext, AuthClaims, query, NotFoundError } from '@medguard360/shared';
import { DenialRow, DenialStatus, AppealRow, AppealStatus } from './types';

export interface CreateDenialInput {
  claimId: string;
  stateCode: string;
  carcCode: string;
  carcDescription: string;
  rarcCodes?: string[];
  deniedAmountCents: number;
  payerMessage?: string;
}

/** Called by the consumer — runs with elevated perms (no RLS). */
export async function persistDenial(input: CreateDenialInput): Promise<DenialRow> {
  const deadline = new Date(); deadline.setDate(deadline.getDate() + 90);
  const r = await query<DenialRow>(
    'denial.persist',
    `INSERT INTO denials (claim_id, state_code, carc_code, carc_description,
                           rarc_codes, denied_amount_cents, payer_message, appeal_deadline)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (claim_id) DO UPDATE
       SET carc_code = EXCLUDED.carc_code,
           carc_description = EXCLUDED.carc_description,
           rarc_codes = EXCLUDED.rarc_codes,
           denied_amount_cents = EXCLUDED.denied_amount_cents,
           payer_message = EXCLUDED.payer_message
     RETURNING *`,
    [input.claimId, input.stateCode, input.carcCode, input.carcDescription,
     input.rarcCodes ?? [], input.deniedAmountCents, input.payerMessage ?? null, deadline],
  );
  return r.rows[0];
}

export async function getDenial(auth: AuthClaims, id: string): Promise<DenialRow & { appeals: AppealRow[] }> {
  return withRlsContext(auth, async (client) => {
    const d = await client.query<DenialRow>('SELECT * FROM denials WHERE id = $1', [id]);
    if (!d.rows[0]) throw new NotFoundError('Denial');
    const a = await client.query<AppealRow>(
      'SELECT * FROM appeals WHERE denial_id = $1 ORDER BY attempt_number',
      [id],
    );
    return { ...d.rows[0], appeals: a.rows };
  });
}

export async function listDenials(auth: AuthClaims, statuses: DenialStatus[], limit = 100): Promise<DenialRow[]> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<DenialRow>(
      `SELECT * FROM denials WHERE status = ANY($1::text[])
       ORDER BY appeal_deadline ASC NULLS LAST LIMIT $2`,
      [statuses, limit],
    );
    return r.rows;
  });
}

export async function setDenialStatus(auth: AuthClaims, id: string, status: DenialStatus): Promise<DenialRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<DenialRow>('UPDATE denials SET status = $2 WHERE id = $1 RETURNING *', [id, status]);
    if (!r.rows[0]) throw new NotFoundError('Denial');
    return r.rows[0];
  });
}

export interface DraftAppealInput {
  denialId: string;
  draftedByAi: boolean;
  aiEngineVersion?: string;
  aiConfidence?: number;
  subject: string;
  body: string;
  attachments: string[];
}

export async function createAppealDraft(auth: AuthClaims, input: DraftAppealInput): Promise<AppealRow> {
  return withRlsContext(auth, async (client) => {
    const seq = await client.query<{ next_attempt: number }>(
      `SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt
         FROM appeals WHERE denial_id = $1`,
      [input.denialId],
    );
    const next = seq.rows[0]?.next_attempt ?? 1;
    const r = await client.query<AppealRow>(
      `INSERT INTO appeals (denial_id, attempt_number, drafted_by_ai, ai_engine_version,
                             ai_confidence, subject, body, attachments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [input.denialId, next, input.draftedByAi, input.aiEngineVersion ?? null,
       input.aiConfidence ?? null, input.subject, input.body, input.attachments],
    );
    await client.query('UPDATE denials SET status = $2 WHERE id = $1 AND status IN (\'received\',\'reviewing\')',
      [input.denialId, 'reviewing']);
    return r.rows[0];
  });
}

export async function reviewAppeal(auth: AuthClaims, appealId: string, edits: { subject?: string; body?: string; attachments?: string[] }): Promise<AppealRow> {
  return withRlsContext(auth, async (client) => {
    const fields: string[] = ['reviewed_by = $1', 'reviewed_at = now()'];
    const params: unknown[] = [auth.sub];
    let idx = 2;
    if (edits.subject !== undefined)     { fields.push(`subject = $${idx++}`);     params.push(edits.subject); }
    if (edits.body !== undefined)        { fields.push(`body = $${idx++}`);        params.push(edits.body); }
    if (edits.attachments !== undefined) { fields.push(`attachments = $${idx++}`); params.push(edits.attachments); }
    params.push(appealId);
    const r = await client.query<AppealRow>(
      `UPDATE appeals SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params,
    );
    if (!r.rows[0]) throw new NotFoundError('Appeal');
    return r.rows[0];
  });
}

export async function submitAppeal(auth: AuthClaims, appealId: string): Promise<AppealRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<AppealRow>(
      `UPDATE appeals SET status = 'submitted', submitted_at = now() WHERE id = $1 RETURNING *`,
      [appealId],
    );
    if (!r.rows[0]) throw new NotFoundError('Appeal');
    await client.query(`UPDATE denials SET status = 'appealing' WHERE id = $1`, [r.rows[0].denial_id]);
    return r.rows[0];
  });
}

export async function recordAppealOutcome(auth: AuthClaims, appealId: string, status: 'won' | 'lost', notes?: string): Promise<AppealRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<AppealRow>(
      `UPDATE appeals SET status = $2, decision_at = now(), decision_notes = $3
       WHERE id = $1 RETURNING *`,
      [appealId, status, notes ?? null],
    );
    if (!r.rows[0]) throw new NotFoundError('Appeal');
    await client.query(
      `UPDATE denials SET status = $2 WHERE id = $1`,
      [r.rows[0].denial_id, status === 'won' ? 'appeal_won' : 'appeal_lost'],
    );
    return r.rows[0];
  });
}
