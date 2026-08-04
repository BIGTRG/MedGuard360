import { parse271 } from './parse271';

describe('parse271', () => {
  it('parses active eligibility details from EB and DTP segments', () => {
    const raw = [
      'ST*271*0001',
      'EB*1*IND*30**NC MEDICAID DIRECT**3.75',
      'DTP*291*D8*20260601',
      'DTP*292*D8*20261231',
      'SE*5*0001',
    ].join('~');

    const parsed = parse271(raw);

    expect(parsed).toEqual({
      active: true,
      planName: 'NC MEDICAID DIRECT',
      effectiveFrom: '2026-06-01',
      effectiveTo: '2026-12-31',
      copay: 3.75,
    });
  });

  it('marks the response inactive and preserves the AAA rejection code', () => {
    const raw = [
      'ST*271*0002',
      'EB*1*IND*30**NC MEDICAID DIRECT**2.00',
      'AAA*N**72*C',
      'SE*4*0002',
    ].join('~');

    const parsed = parse271(raw);

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('72');
    expect(parsed.planName).toBe('NC MEDICAID DIRECT');
  });
});
