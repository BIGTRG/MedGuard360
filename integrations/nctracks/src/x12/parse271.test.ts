import { parse271 } from './parse271';

describe('parse271', () => {
  it('keeps AAA rejections inactive even when a later EB row is active', () => {
    const parsed = parse271([
      'ST*271*0001*005010X279A1',
      'AAA*N**72*C',
      'EB*1*IND*30**MEDICAID',
      'SE*4*0001',
    ].join('~'));

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('72');
  });

  it('does not mark health plan coverage active from non-health-plan EB rows', () => {
    const parsed = parse271([
      'ST*271*0001*005010X279A1',
      'EB*6*IND*30',
      'EB*1*IND*88**PHARMACY',
      'SE*4*0001',
    ].join('~'));

    expect(parsed.active).toBe(false);
  });
});
