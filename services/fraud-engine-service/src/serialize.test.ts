import { toDetailView, toPortalView } from './serialize';
import { FraudCase } from './types';

const baseCase: FraudCase = {
  id: '60000000-0000-0000-0000-000000000002',
  claim_id: '70000000-0000-0000-0000-000000000001',
  provider_user_id: '80000000-0000-0000-0000-000000000001',
  patient_id: '10000000-0000-0000-0000-000000000001',
  state_code: 'NC',
  risk_score: 88,
  risk_level: 'critical',
  flags: ['duplicate_billing'],
  recommendation: 'auto_block',
  ai_explanation: 'High-risk duplicate billing pattern.',
  status: 'open',
  assigned_to: 'fraud@demo.medguard360.com',
  ai_engine_unavailable: false,
  resolved_at: null,
  resolution_notes: null,
  escalated_at: null,
  escalated_by: null,
  escalation_target: null,
  escalation_notes: null,
  opened_at: new Date('2026-06-10T12:00:00Z'),
  created_at: new Date('2026-06-10T12:00:00Z'),
  updated_at: new Date('2026-06-10T12:00:00Z'),
};

describe('serialize portal views', () => {
  it('toPortalView normalizes recommendation and score', () => {
    const view = toPortalView(baseCase);
    expect(view.id).toBe(baseCase.id);
    expect(view.score).toBe(88);
    expect(view.recommendation).toBe('auto_block');
    expect(view.assigned_investigator).toBe('fraud@demo.medguard360.com');
  });

  it('defaults unknown recommendations to route_to_review', () => {
    const view = toPortalView({ ...baseCase, recommendation: 'unknown' });
    expect(view.recommendation).toBe('route_to_review');
  });

  it('toDetailView includes investigator fields', () => {
    const detail = toDetailView(baseCase);
    expect(detail.flags).toEqual(['duplicate_billing']);
    expect(detail.risk_level).toBe('critical');
    expect(detail.ai_explanation).toContain('duplicate billing');
  });
});