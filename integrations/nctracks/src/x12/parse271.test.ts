import { parse271 } from './parse271';

describe('parse271', () => {
  it('extracts active eligibility, benefit plan, copay, and effective dates', () => {
    const parsed = parse271([
      'ISA*00*',
      'EB*1**30**MEDICAID STANDARD PLAN**15',
      'DTP*291*D8*20260701',
      'DTP*292*D8*20261231',
    ].join('~'));

    expect(parsed).toEqual({
      active: true,
      planName: 'MEDICAID STANDARD PLAN',
      copay: 15,
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-12-31',
    });
  });

  it('marks AAA rejection responses inactive and preserves the rejection code', () => {
    expect(parse271('AAA*N**75*C~')).toEqual({
      active: false,
      aaaCode: '75',
    });
  });

  it('keeps the first plan name and ignores malformed DTP dates', () => {
    const parsed = parse271([
      'EB*1**30**FIRST PLAN**0',
      'EB*1**30**SECOND PLAN**5',
      'DTP*291*D8*2026-07-01',
    ].join('\n'));

    expect(parsed.planName).toBe('FIRST PLAN');
    expect(parsed.copay).toBe(5);
    expect(parsed.effectiveFrom).toBeUndefined();
  });
});
