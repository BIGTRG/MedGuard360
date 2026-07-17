import { parse271 } from './parse271';

describe('parse271', () => {
  it('extracts active coverage, plan name, copay, and effective dates', () => {
    const parsed = parse271([
      'ISA*00*~',
      'EB*1*IND*30**MEDICAID DIRECT**0~',
      'DTP*291*D8*20260701~',
      'DTP*292*D8*20261231~',
    ].join('\n'));

    expect(parsed).toEqual({
      active: true,
      planName: 'MEDICAID DIRECT',
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-12-31',
      copay: 0,
    });
  });

  it('keeps inactive EB responses inactive without fabricating benefit details', () => {
    expect(parse271('EB*6~')).toEqual({ active: false });
  });

  it('extracts AAA rejection codes for eligibility errors', () => {
    expect(parse271('AAA*N**75*C~')).toEqual({
      active: false,
      aaaCode: '75',
    });
  });

  it('ignores malformed DTP dates instead of emitting partial ISO dates', () => {
    const parsed = parse271('EB*1*IND*30**MEDICAID DIRECT**3~DTP*291*D8*202607~');

    expect(parsed.active).toBe(true);
    expect(parsed.effectiveFrom).toBeUndefined();
    expect(parsed.copay).toBe(3);
  });
});
