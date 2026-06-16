import { FraudCase, FraudCasePortalView } from './types';

/** Map internal fraud case row to the portal queue/detail contract. */
export function toPortalView(c: FraudCase): FraudCasePortalView {
  const rec = c.recommendation;
  const recommendation: FraudCasePortalView['recommendation'] =
    rec === 'auto_pay' || rec === 'route_to_review' || rec === 'auto_block'
      ? rec
      : 'route_to_review';

  return {
    id: c.id,
    claim_id: c.claim_id,
    state_code: c.state_code,
    status: c.status,
    opened_at: c.opened_at.toISOString(),
    assigned_investigator: c.assigned_to,
    score: c.risk_score ?? 0,
    recommendation,
    explanation: c.ai_explanation ?? '',
  };
}

/** Full investigator detail — includes portal aliases plus fields for /fraud/cases/[id]. */
export function toDetailView(c: FraudCase): FraudCasePortalView & Record<string, unknown> {
  const portal = toPortalView(c);
  return {
    ...portal,
    provider_user_id: c.provider_user_id,
    patient_id: c.patient_id,
    risk_score: c.risk_score,
    risk_level: c.risk_level,
    flags: c.flags,
    ai_explanation: c.ai_explanation,
    assigned_to: c.assigned_to,
    ai_engine_unavailable: c.ai_engine_unavailable,
    resolved_at: c.resolved_at?.toISOString() ?? null,
    resolution_notes: c.resolution_notes,
    escalated_at: c.escalated_at?.toISOString() ?? null,
    escalated_by: c.escalated_by,
    escalation_target: c.escalation_target,
    escalation_notes: c.escalation_notes,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
  };
}