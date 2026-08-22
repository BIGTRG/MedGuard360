import { parse271 } from './parse271';

describe('parse271', () => {
  it('keeps AAA rejections inactive even when later EB segments appear active', () => {
    const parsed = parse271('ST*271*0001~AAA*N**72*C~EB*1*IND*30**MEDICAID~SE*4*0001~');
    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('72');
  });

  it('does not mark non-health-plan EB service types as active coverage', () => {
    const parsed = parse271('ST*271*0001~EB*1*IND*88**PHARMACY~SE*3*0001~');
    expect(parsed.active).toBe(false);
  });

  it('marks health benefit plan EB service type 30 active', () => {
    const parsed = parse271('ST*271*0001~EB*1*IND*30**MEDICAID~SE*3*0001~');
    expect(parsed.active).toBe(true);
  });
});
