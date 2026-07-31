import { parse271 } from './parse271';

describe('parse271', () => {
  it('detects active coverage and captures the first plan name and copay', () => {
    const parsed = parse271([
      'EB*1*IND*30*INS*NC MEDICAID**3.50',
      'EB*1*IND*98*INS*SECONDARY PLAN**10',
    ].join('~'));

    expect(parsed.active).toBe(true);
    expect(parsed.planName).toBe('NC MEDICAID');
    expect(parsed.copay).toBe(3.5);
  });

  it('extracts effective date ranges from DTP segments', () => {
    const parsed = parse271('DTP*291*D8*20260101~DTP*292*D8*20261231~');

    expect(parsed.effectiveFrom).toBe('2026-01-01');
    expect(parsed.effectiveTo).toBe('2026-12-31');
  });

  it('handles newline-separated segments returned by some CORE gateways', () => {
    const parsed = parse271('EB*1*IND*30*INS*NC MEDICAID\nDTP*291*D8*20260714');

    expect(parsed.active).toBe(true);
    expect(parsed.effectiveFrom).toBe('2026-07-14');
  });

  it('returns an AAA code and inactive status for eligibility rejection responses', () => {
    const parsed = parse271('EB*1*IND*30*INS*NC MEDICAID~AAA*N**41*C~');

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('41');
  });
});
