import { parse271 } from './parse271';

describe('parse271', () => {
  it('keeps AAA rejections authoritative even when EB active appears later', () => {
    const parsed = parse271([
      'ST*271*0001*005010X279A1',
      'AAA*N**72*C',
      'EB*1**30**MEDICAID',
      'SE*4*0001',
    ].join('~'));

    expect(parsed.aaaCode).toBe('72');
    expect(parsed.active).toBe(false);
  });
});
