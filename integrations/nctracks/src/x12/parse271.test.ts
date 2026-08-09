import { parse271 } from './parse271';

describe('parse271', () => {
  it('keeps AAA rejection authoritative when a later EB segment appears', () => {
    const raw = [
      'ST*271*0001',
      'AAA*N**75*C',
      'EB*1*IND*30**MEDICAID',
      'SE*4*0001',
    ].join('~');

    const parsed = parse271(raw);
    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('75');
  });

  it('does not mark non-health-plan EB segments as active coverage', () => {
    const parsed = parse271('ST*271*0001~EB*1*IND*88**PHARMACY~SE*3*0001~');

    expect(parsed.active).toBe(false);
    expect(parsed.planName).toBe('PHARMACY');
  });
});
