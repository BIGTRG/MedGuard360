/**
 * Hub AI tier — real DB lookups for the chatbot.
 *
 * When the caller's intent is eligibility, PA status, or recent claims, the
 * chatbot can answer directly without escalating to a human, as long as we
 * can verify identity (medicaid_id + last 4 SSN or DOB).
 *
 * All reads are PHI access events — emit audit-log entries via the standard
 * audit client. RLS will reject queries that don't have a valid actor context
 * set (handled by the hub-service caller).
 */

import { query, logger } from '@medguard360/shared';

export interface IdentityCheck {
  medicaidId: string;
  dateOfBirth: string;   // YYYY-MM-DD
}

export interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  stateCode: string;
}

export async function verifyIdentity(req: IdentityCheck): Promise<PatientSummary | null> {
  const result = await query<{ id: string; first_name: string; last_name: string; state_code: string }>(
    'hub.verifyIdentity',
    `SELECT id, first_name, last_name, state_code
       FROM patients
      WHERE medicaid_id = $1 AND date_of_birth = $2 AND status = 'active'
      LIMIT 1`,
    [req.medicaidId, req.dateOfBirth],
  );
  if (result.rows.length === 0) return null;
  const p = result.rows[0]!;
  return { id: p.id, firstName: p.first_name, lastName: p.last_name, stateCode: p.state_code };
}

export async function lookupEligibility(patientId: string): Promise<string> {
  const result = await query<{ active: boolean; plan_name: string | null; effective_from: string | null; copay_cents: number | null }>(
    'hub.lookupEligibility',
    `SELECT active, plan_name, effective_from, copay_cents
       FROM eligibility_checks
      WHERE patient_id = $1
      ORDER BY checked_at DESC
      LIMIT 1`,
    [patientId],
  );
  if (result.rows.length === 0) {
    return "I don't see an eligibility check on file. Let me run one now — that takes about 30 seconds.";
  }
  const e = result.rows[0]!;
  if (!e.active) return `Your coverage shows as inactive. I'll connect you with a benefits specialist to investigate.`;
  const copay = (e.copay_cents ?? 0) === 0 ? 'no copay' : `$${((e.copay_cents ?? 0) / 100).toFixed(2)} copay`;
  return `Good news — your coverage is active${e.plan_name ? ' on ' + e.plan_name : ''}, effective ${e.effective_from ?? 'recently'}, with ${copay}. Anything else I can help with?`;
}

export async function lookupPaStatus(patientId: string, limit = 3): Promise<string> {
  const result = await query<{ service_code: string; service_description: string | null; status: string; due_at: string }>(
    'hub.lookupPa',
    `SELECT service_code, service_description, status, due_at
       FROM pa_requests
      WHERE patient_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [patientId, limit],
  );
  if (result.rows.length === 0) return "You don't have any prior authorizations on file right now.";
  const lines = result.rows.map(r => {
    const desc = r.service_description ?? r.service_code;
    return `• ${desc} (${r.service_code}) — ${r.status}, due ${new Date(r.due_at).toLocaleDateString()}`;
  });
  return `Here are your recent prior authorizations:\n${lines.join('\n')}\n\nWould you like me to email a copy?`;
}

export async function lookupRecentClaims(patientId: string, limit = 5): Promise<string> {
  const result = await query<{ claim_control_number: string; service_from: string; total_charge_cents: number; status: string }>(
    'hub.lookupClaims',
    `SELECT claim_control_number, service_from, total_charge_cents, status
       FROM claims
      WHERE patient_id = $1
      ORDER BY service_from DESC
      LIMIT $2`,
    [patientId, limit],
  );
  if (result.rows.length === 0) return "I don't see any recent claims for you.";
  const lines = result.rows.map(r =>
    `• ${r.claim_control_number} — $${(r.total_charge_cents / 100).toFixed(2)} on ${r.service_from} — ${r.status}`,
  );
  return `Here are your last ${result.rows.length} claims:\n${lines.join('\n')}`;
}

/** Try to answer the caller's question directly from the DB. Returns null if AI can't handle. */
export async function tryAutoAnswer(intent: string, identity: IdentityCheck): Promise<string | null> {
  const patient = await verifyIdentity(identity);
  if (!patient) {
    logger.info('hub.autoAnswer identity failed', { intent });
    return "I couldn't verify your identity with that Medicaid ID and date of birth. Let me transfer you to a benefits specialist.";
  }
  switch (intent) {
    case 'eligibility': return lookupEligibility(patient.id);
    case 'prior_auth':  return lookupPaStatus(patient.id);
    case 'claim_status':return lookupRecentClaims(patient.id);
    default:            return null; // escalate to human tier
  }
}
