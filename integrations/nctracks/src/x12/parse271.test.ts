import { parse271 } from './parse271';

describe('parse271', () => {
  it('keeps AAA rejections inactive even when later EB segments are active', () => {
    const parsed = parse271('ST*271*0001~AAA*N**75*C~EB*1*IND*30**MEDICAID~SE*4*0001~');

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('75');
  });
});
