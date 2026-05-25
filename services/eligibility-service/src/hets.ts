/**
 * HETS (HIPAA Eligibility Transaction System) enrollment tracker.
 *
 * Effective 2026-05-11, CMS requires every Medicare 270/271 to carry the
 * originating submitter's HETS UID. MedGuard360 is the HETS submitter on
 * behalf of contracted providers; each provider NPI must be attested under
 * the MedGuard360 HETS UID before Medicare eligibility checks succeed.
 *
 * - Stores attestation status per NPI
 * - Updates last_aaa41_at when an AAA-41 response is received
 * - Surfaces a compliance block list so the provider portal can warn / disable
 *   Medicare eligibility checks for un-attested NPIs.
 *
 * Reference:
 *   - migration 0025_hets_enrollment.sql
 *   - integrations/cms/README.md (HETS section)
 */

import { query } from '@medguard360/shared';

export type HetsAttestationStatus = 'not_started' | 'pending' | 'attested' | 'revoked' | 'rejected';

export interface HetsEnrollment {
  id: string;
  provider_id: string;
  npi: string;
  hets_submitter_uid: string;
  attestation_status: HetsAttestationStatus;
  attestation_submitted_at: string | null;
  attestation_confirmed_at: string | null;
  attestation_expires_at: string | null;
  last_aaa41_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Returns the HETS row for the given NPI under our current submitter UID, or null. */
export async function getEnrollment(npi: string, hetsSubmitterUid: string): Promise<HetsEnrollment | null> {
  const r = await query<HetsEnrollment>(
    'hets.get',
    `SELECT * FROM hets_enrollments WHERE npi = $1 AND hets_submitter_uid = $2 LIMIT 1`,
    [npi, hetsSubmitterUid],
  );
  return r.rows[0] ?? null;
}

/** True if the NPI is allowed to run Medicare eligibility under our submitter. */
export async function isNpiAttested(npi: string, hetsSubmitterUid: string): Promise<boolean> {
  const enr = await getEnrollment(npi, hetsSubmitterUid);
  return enr?.attestation_status === 'attested';
}

/** List enrollments — used by /eligibility/hets-status and the portal compliance dashboard. */
export async function listEnrollments(filters: { stateCode?: string; status?: HetsAttestationStatus; limit?: number } = {}): Promise<HetsEnrollment[]> {
  const where: string[] = []; const params: unknown[] = [];
  if (filters.stateCode) {
    params.push(filters.stateCode);
    where.push(`provider_id IN (SELECT id FROM providers WHERE state_code = $${params.length})`);
  }
  if (filters.status) { params.push(filters.status); where.push(`attestation_status = $${params.length}`); }
  const lim = filters.limit ?? 500;
  const r = await query<HetsEnrollment>(
    'hets.list',
    `SELECT * FROM hets_enrollments ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY attestation_status, npi LIMIT ${lim}`,
    params,
  );
  return r.rows;
}

export async function recordAaa41(npi: string, hetsSubmitterUid: string): Promise<void> {
  await query(
    'hets.recordAaa41',
    `UPDATE hets_enrollments SET last_aaa41_at = now()
      WHERE npi = $1 AND hets_submitter_uid = $2`,
    [npi, hetsSubmitterUid],
  );
}

export async function upsertEnrollment(input: { providerId: string; npi: string; hetsSubmitterUid: string; status: HetsAttestationStatus; notes?: string }): Promise<HetsEnrollment> {
  const r = await query<HetsEnrollment>(
    'hets.upsert',
    `INSERT INTO hets_enrollments (provider_id, npi, hets_submitter_uid, attestation_status, notes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (npi, hets_submitter_uid) DO UPDATE SET
       attestation_status = EXCLUDED.attestation_status,
       attestation_submitted_at = CASE WHEN EXCLUDED.attestation_status = 'pending' THEN now() ELSE hets_enrollments.attestation_submitted_at END,
       attestation_confirmed_at = CASE WHEN EXCLUDED.attestation_status = 'attested' THEN now() ELSE hets_enrollments.attestation_confirmed_at END,
       notes = COALESCE(EXCLUDED.notes, hets_enrollments.notes),
       updated_at = now()
     RETURNING *`,
    [input.providerId, input.npi, input.hetsSubmitterUid, input.status, input.notes ?? null],
  );
  return r.rows[0];
}
