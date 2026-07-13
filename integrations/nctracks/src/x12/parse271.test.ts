import { parse271 } from './parse271';

describe('parse271', () => {
  it('extracts active coverage, plan, eligibility dates, and copay from EB/DTP segments', () => {
    const parsed = parse271([
      'EB*1*IND*30**NC MEDICAID DIRECT*23*3.5',
      'DTP*291*D8*20260701',
      'DTP*292*D8*20260731',
    ].join('~'));

    expect(parsed).toEqual({
      active: true,
      planName: 'NC MEDICAID DIRECT',
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-07-31',
      copay: 3.5,
    });
  });

  it('captures AAA rejection codes as inactive eligibility', () => {
    const parsed = parse271('AAA*N**72*C~');

    expect(parsed).toEqual({
      active: false,
      aaaCode: '72',
    });
  });
});
