import { classify } from './intent';

describe('intent classifier', () => {
  it('flags crisis language with handoff', () => {
    const r = classify('I want to kill myself');
    expect(r.intent).toBe('crisis');
    expect(r.shouldHandoff).toBe(true);
  });

  it('detects eligibility questions', () => {
    expect(classify('Am I covered for therapy?').intent).toBe('eligibility');
    expect(classify('Do I have Medicaid still?').intent).toBe('eligibility');
  });

  it('detects claim status questions', () => {
    expect(classify('Why was my claim denied?').intent).toBe('claim_status');
  });

  it('falls back to other with handoff for unknown intent', () => {
    const r = classify('Can you help me find a recipe?');
    expect(r.intent).toBe('other');
    expect(r.shouldHandoff).toBe(true);
  });
});
