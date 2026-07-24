import { parse271 } from './parse271';

describe('parse271', () => {
  it('extracts active coverage, plan, copay, and effective dates', () => {
    const parsed = parse271([
      'ISA*00*~',
      'ST*271*0001~',
      'EB*1**30**STANDARD_PLAN:HEALTHY_BLUE**3.5~',
      'DTP*291*D8*20260701~',
      'DTP*292*D8*20261231~',
      'SE*5*0001~',
    ].join('\n'));

    expect(parsed).toEqual({
      active: true,
      planName: 'STANDARD_PLAN:HEALTHY_BLUE',
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-12-31',
      copay: 3.5,
    });
  });

  it('reports AAA rejection codes as inactive error context', () => {
    const parsed = parse271('ST*271*0001~AAA*N**75*C~SE*3*0001~');

    expect(parsed).toEqual({
      active: false,
      aaaCode: '75',
    });
  });

  it('ignores malformed DTP dates instead of emitting invalid ISO values', () => {
    const parsed = parse271('EB*6**30~DTP*291*D8*202607~');

    expect(parsed).toEqual({ active: false });
  });
});
