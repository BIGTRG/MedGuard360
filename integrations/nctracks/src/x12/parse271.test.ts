import { parse271 } from './parse271';

describe('parse271', () => {
  it('parses active eligibility, plan name, effective dates, and copay', () => {
    const parsed = parse271([
      'ISA*00*          *00*          *ZZ*NCXIX          *ZZ*TP12345        *260711*1234*^*00501*000000001*0*T*:~',
      'GS*HB*NCXIX*TP12345*20260711*1234*1*X*005010X279A1~',
      'ST*271*0001*005010X279A1~',
      'EB*1*IND*30**MEDICAID**3.50~',
      'DTP*291*D8*20260501~',
      'DTP*292*D8*20260531~',
      'SE*6*0001~',
    ].join(''));

    expect(parsed).toEqual({
      active: true,
      planName: 'MEDICAID',
      effectiveFrom: '2026-05-01',
      effectiveTo: '2026-05-31',
      copay: 3.5,
    });
  });

  it('leaves eligibility inactive when EB does not indicate active coverage', () => {
    const parsed = parse271('ST*271*0001~EB*6*IND*30**MEDICAID~SE*3*0001~');

    expect(parsed.active).toBe(false);
    expect(parsed.planName).toBe('MEDICAID');
    expect(parsed.aaaCode).toBeUndefined();
  });

  it('captures AAA rejection codes for real-time eligibility errors', () => {
    const parsed = parse271('ST*271*0001~AAA*N**75*C~SE*3*0001~');

    expect(parsed).toEqual({
      active: false,
      aaaCode: '75',
    });
  });

  it('ignores non-D8 date formats instead of emitting malformed ISO dates', () => {
    const parsed = parse271('ST*271*0001~EB*1*IND*30**MEDICAID~DTP*291*RD8*20260501-20260531~SE*4*0001~');

    expect(parsed.active).toBe(true);
    expect(parsed.effectiveFrom).toBeUndefined();
    expect(parsed.effectiveTo).toBeUndefined();
  });
});
