import { parse271 } from './parse271';

describe('parse271', () => {
  it('extracts active medical coverage details from EB and DTP segments', () => {
    const raw = [
      'ST*271*0001~',
      'EB*1*IND*30**NC Medicaid Direct**2.50~',
      'DTP*291*D8*20260601~',
      'DTP*292*D8*20261231~',
      'SE*4*0001~',
    ].join('');

    const parsed = parse271(raw);

    expect(parsed).toEqual({
      active: true,
      planName: 'NC Medicaid Direct',
      effectiveFrom: '2026-06-01',
      effectiveTo: '2026-12-31',
      copay: 2.5,
    });
  });

  it('returns inactive with the AAA rejection code when NCTracks rejects eligibility', () => {
    const parsed = parse271('ST*271*0001~AAA*N**41*C~SE*3*0001~');

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('41');
    expect(parsed.planName).toBeUndefined();
    expect(parsed.copay).toBeUndefined();
  });
});
