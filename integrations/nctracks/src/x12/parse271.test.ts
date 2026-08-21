import { parse271 } from './parse271';

describe('parse271', () => {
  it('parses active eligibility details from EB and DTP segments', () => {
    const raw = [
      'ST*271*0001~',
      'EB*1*IND*30**MEDICAID**3.25~',
      'DTP*291*D8*20260601',
      'DTP*292*D8*20260630~',
    ].join('\n');

    expect(parse271(raw)).toEqual({
      active: true,
      planName: 'MEDICAID',
      copay: 3.25,
      effectiveFrom: '2026-06-01',
      effectiveTo: '2026-06-30',
    });
  });

  it('preserves the first plan name when multiple EB rows are present', () => {
    const parsed = parse271('EB*1*IND*30**MEDICAID~EB*1*IND*30**TAILORED_PLAN~');

    expect(parsed.active).toBe(true);
    expect(parsed.planName).toBe('MEDICAID');
  });

  it('marks the response inactive with an AAA rejection code even after active EB coverage', () => {
    const parsed = parse271('EB*1*IND*30**MEDICAID~AAA*N**75*C~');

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('75');
  });

  it('returns inactive defaults for empty or non-X12 payloads', () => {
    expect(parse271('')).toEqual({ active: false });
    expect(parse271('not an x12 eligibility response')).toEqual({ active: false });
  });
});
