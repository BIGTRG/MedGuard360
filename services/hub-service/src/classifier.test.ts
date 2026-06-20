import { classifyIntent } from './classifier';

describe('classifyIntent', () => {
  it('detects crisis language with high confidence', () => {
    const result = classifyIntent('I want to hurt myself and need help');
    expect(result.intent).toBe('crisis');
    expect(result.crisisFlag).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('routes eligibility questions', () => {
    const result = classifyIntent('Am I still covered by Medicaid?');
    expect(result.intent).toBe('eligibility');
  });

  it('falls back to general for unknown input', () => {
    const result = classifyIntent('What time do you close?');
    expect(result.intent).toBe('general');
    expect(result.confidence).toBeLessThan(0.5);
  });
});