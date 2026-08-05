import { parse271 } from './parse271';

describe('parse271', () => {
  it('extracts active eligibility plan details and coverage dates', () => {
    const raw = [
      'ST*271*0001~',
      'EB*1*IND*30**NC MEDICAID DIRECT*23*3.50~',
      'DTP*291*D8*20260801~',
      'DTP*292*D8*20261231~',
      'SE*5*0001~',
    ].join('');

    const parsed = parse271(raw);

    expect(parsed).toEqual({
      active: true,
      planName: 'NC MEDICAID DIRECT',
      effectiveFrom: '2026-08-01',
      effectiveTo: '2026-12-31',
      copay: 3.5,
    });
  });

  it('captures AAA rejection codes as inactive eligibility', () => {
    const parsed = parse271('ST*271*0001~AAA*N**72*C~SE*3*0001~');

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('72');
  });

  it('keeps the first plan name while still reading general service copays', () => {
    const raw = [
      'EB*1*IND*1**PRIMARY CARE CAROLINA ACCESS~',
      'EB*1*IND*30**NC MEDICAID DIRECT*23*7.25~',
    ].join('');

    const parsed = parse271(raw);

    expect(parsed.active).toBe(true);
    expect(parsed.planName).toBe('PRIMARY CARE CAROLINA ACCESS');
    expect(parsed.copay).toBe(7.25);
  });
});
