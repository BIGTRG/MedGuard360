/**
 * Community Engagement Verification (WFTC H.R. 1 / P.L. 119-21).
 *
 * Expansion-state Medicaid enrollees age 19-64 must verify 80 hrs/mo of
 * qualifying engagement (work, school, training, volunteer, caregiving) or
 * an approved exemption. Renewal every 6 months. Mandatory by 2027-01-01.
 *
 * Reference: migration 0026, CMS guidance, state_configs.community_engagement_rules
 */

import { query } from '@medguard360/shared';

export type EngagementType =
  | 'employed' | 'self_employed' | 'job_training' | 'education' | 'volunteer'
  | 'caregiving' | 'medically_exempt' | 'disabled_exempt' | 'pregnant_exempt'
  | 'age_exempt_under19' | 'age_exempt_over64' | 'tribal_exempt';

export type ExemptionCode =
  | 'medical' | 'disability' | 'pregnancy' | 'caregiver' | 'tribal' | 'good_faith_delay';

export type EngagementStatus = 'submitted' | 'verified' | 'rejected' | 'pending_review' | 'expired';

export type VerificationSource =
  | 'payroll_attestation' | 'employer_attestation' | 'school_enrollment'
  | 'volunteer_org' | 'medical_provider' | 'tribal_affirmation'
  | 'self_attestation' | 'irs_data' | 'swic_data';

export interface EngagementRecord {
  id: string;
  patient_id: string;
  state_code: string;
  reporting_period: string;
  hours_documented: number;
  engagement_type: EngagementType;
  exemption_code: ExemptionCode | null;
  verification_source: VerificationSource;
  status: EngagementStatus;
  verified_at: string | null;
  next_renewal_due_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitInput {
  patientId: string;
  stateCode: string;
  reportingPeriod: string;     // YYYY-MM
  hoursDocumented: number;
  engagementType: EngagementType;
  exemptionCode?: ExemptionCode;
  verificationSource: VerificationSource;
  notes?: string;
  createdBy: string;
}

/** Compute the next 6-month renewal deadline for a given record. */
export function computeNextRenewal(now: Date = new Date()): string {
  const d = new Date(now); d.setUTCMonth(d.getUTCMonth() + 6);
  return d.toISOString();
}

/** A patient's CURRENT community engagement status — the most recent verified
 *  record OR the most recent submitted record if nothing is verified. */
export interface EngagementStatusSummary {
  patient_id: string;
  state_code: string;
  required: boolean;
  rule_reason?: string;
  current_record: EngagementRecord | null;
  history: EngagementRecord[];
  next_renewal_due_at: string | null;
  days_until_renewal: number | null;
  compliance_status: 'compliant' | 'pending' | 'overdue' | 'exempt' | 'not_required';
  notification_window: '60_day' | '30_day' | '7_day' | 'overdue' | 'none';
}

export async function getEngagementSummary(patientId: string): Promise<EngagementStatusSummary> {
  const patRes = await query<{ id: string; state_code: string }>(
    'ce.getPatient',
    `SELECT id, state_code FROM patients WHERE id = $1`,
    [patientId],
  );
  const pat = patRes.rows[0];
  if (!pat) throw new Error('patient not found');

  const ruleRes = await query<{ community_engagement_rules: Record<string, unknown> }>(
    'ce.getRule',
    `SELECT community_engagement_rules FROM state_configs WHERE state_code = $1`,
    [pat.state_code],
  );
  const rule = ruleRes.rows[0]?.community_engagement_rules ?? {};
  const required = Boolean(rule.required);

  const histRes = await query<EngagementRecord>(
    'ce.history',
    `SELECT * FROM community_engagement_records WHERE patient_id = $1 ORDER BY reporting_period DESC LIMIT 24`,
    [patientId],
  );
  const history = histRes.rows;
  const current = history.find(r => r.status === 'verified') ?? history[0] ?? null;
  const nextRenewal = current?.next_renewal_due_at ?? null;
  const daysUntil = nextRenewal
    ? Math.ceil((new Date(nextRenewal).getTime() - Date.now()) / 86_400_000)
    : null;

  const exempt = current?.engagement_type.includes('exempt');
  const compliance: EngagementStatusSummary['compliance_status'] =
    !required ? 'not_required'
    : exempt ? 'exempt'
    : current?.status === 'verified' && daysUntil !== null && daysUntil > 0 ? 'compliant'
    : current?.status === 'verified' && daysUntil !== null && daysUntil <= 0 ? 'overdue'
    : current?.status === 'submitted' || current?.status === 'pending_review' ? 'pending'
    : 'overdue';

  const window: EngagementStatusSummary['notification_window'] =
    daysUntil === null ? 'none'
    : daysUntil <= 0 ? 'overdue'
    : daysUntil <= 7 ? '7_day'
    : daysUntil <= 30 ? '30_day'
    : daysUntil <= 60 ? '60_day' : 'none';

  return {
    patient_id: patientId,
    state_code: pat.state_code,
    required,
    rule_reason: typeof rule.reason === 'string' ? rule.reason : undefined,
    current_record: current ?? null,
    history,
    next_renewal_due_at: nextRenewal,
    days_until_renewal: daysUntil,
    compliance_status: compliance,
    notification_window: window,
  };
}

export async function submitRecord(input: SubmitInput): Promise<EngagementRecord> {
  const renewal = computeNextRenewal();
  const r = await query<EngagementRecord>(
    'ce.submit',
    `INSERT INTO community_engagement_records (
       patient_id, state_code, reporting_period, hours_documented,
       engagement_type, exemption_code, verification_source, status,
       next_renewal_due_at, notes, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7,
       CASE WHEN $7 IN ('irs_data','swic_data','payroll_attestation','employer_attestation') THEN 'verified' ELSE 'submitted' END,
       $8, $9, $10
     ) RETURNING *`,
    [
      input.patientId, input.stateCode, input.reportingPeriod, input.hoursDocumented,
      input.engagementType, input.exemptionCode ?? null, input.verificationSource,
      renewal, input.notes ?? null, input.createdBy,
    ],
  );
  return r.rows[0];
}

export async function listOverdue(stateCode?: string): Promise<EngagementRecord[]> {
  const params: unknown[] = [];
  let where = `next_renewal_due_at < now()`;
  if (stateCode) { params.push(stateCode); where += ` AND state_code = $${params.length}`; }
  const r = await query<EngagementRecord>(
    'ce.overdue',
    `SELECT * FROM community_engagement_records WHERE ${where} ORDER BY next_renewal_due_at LIMIT 500`,
    params,
  );
  return r.rows;
}
