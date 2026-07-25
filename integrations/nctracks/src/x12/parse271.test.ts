import { parse271 } from './parse271';

describe('parse271', () => {
  it('extracts active coverage details, plan name, copay, and effective dates', () => {
    const parsed = parse271([
      'EB*1**30**MEDICAID**12.5',
      'DTP*291*D8*20260701',
      'DTP*292*D8*20261231',
    ].join('~'));

    expect(parsed).toEqual({
      active: true,
      planName: 'MEDICAID',
      copay: 12.5,
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-12-31',
    });
  });

  it('returns AAA rejection details as an inactive eligibility response marker', () => {
    expect(parse271('AAA*Y**75*C~')).toEqual({
      active: false,
      aaaCode: '75',
    });
  });

  it('ignores blank segments and malformed DTP dates', () => {
    expect(parse271('\nEB*6**30~\nDTP*291*D8*202607~')).toEqual({ active: false });
  });
});
