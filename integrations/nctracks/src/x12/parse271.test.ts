import { parse271 } from './parse271';

describe('parse271', () => {
  it('extracts active coverage, plan name, copay, and effective dates from mixed delimiters', () => {
    const parsed = parse271([
      'ST*271*0001',
      'EB*1*IND*30*MC*NC MEDICAID**12.25',
      'DTP*291*D8*20260101',
      'DTP*292*D8*20261231~SE*5*0001~',
    ].join('\n'));

    expect(parsed).toEqual({
      active: true,
      planName: 'NC MEDICAID',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      copay: 12.25,
    });
  });

  it('captures AAA rejection code and leaves coverage inactive', () => {
    const parsed = parse271('ST*271*0001~AAA*N**75*C~SE*3*0001~');

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('75');
    expect(parsed.planName).toBeUndefined();
    expect(parsed.copay).toBeUndefined();
  });

  it('does not overwrite the first plan name when later EB segments are present', () => {
    const parsed = parse271([
      'EB*1*IND*30*MC*PRIMARY PLAN**0',
      'EB*1*IND*35*MC*SECONDARY PLAN**5',
    ].join('~'));

    expect(parsed.active).toBe(true);
    expect(parsed.planName).toBe('PRIMARY PLAN');
    expect(parsed.copay).toBe(0);
  });
});
