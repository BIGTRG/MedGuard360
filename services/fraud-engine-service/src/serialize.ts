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