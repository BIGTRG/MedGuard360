import { parse271 } from './parse271';

describe('parse271', () => {
  it('extracts active eligibility, plan, copay, and coverage dates from EB/DTP segments', () => {
    const parsed = parse271([
      'ST*271*0001',
      'EB*1*IND*30**NC MEDICAID STANDARD PLAN**25.5',
      'DTP*291*D8*20260701',
      'DTP*292*D8*20261231',
      'SE*5*0001',
    ].join('~'));

    expect(parsed).toEqual({
      active: true,
      planName: 'NC MEDICAID STANDARD PLAN',
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-12-31',
      copay: 25.5,
    });
  });

  it('preserves the first plan name when multiple eligibility benefit segments are present', () => {
    const parsed = parse271([
      'EB*1*IND*30**PRIMARY MEDICAID PLAN',
      'EB*1*IND*98**ANCILLARY BENEFIT',
    ].join('~'));

    expect(parsed.planName).toBe('PRIMARY MEDICAID PLAN');
  });

  it('returns an inactive rejection when NCTracks sends an AAA segment', () => {
    const parsed = parse271('AAA*N**72*C~');

    expect(parsed).toEqual({
      active: false,
      aaaCode: '72',
    });
  });

  it('handles newline-delimited payloads from copied payer responses', () => {
    const parsed = parse271('ST*271*0001\nEB*1*IND*30**NC MEDICAID~\rDTP*291*D8*20260718');

    expect(parsed.active).toBe(true);
    expect(parsed.planName).toBe('NC MEDICAID');
    expect(parsed.effectiveFrom).toBe('2026-07-18');
  });
});
