import { parse271 } from './parse271';

describe('parse271', () => {
  it('does not allow EB active segments to override AAA rejections', () => {
    const parsed = parse271('AAA*N**75*C~EB*1*IND*30**MEDICAID~');

    expect(parsed.aaaCode).toBe('75');
    expect(parsed.active).toBe(false);
  });

  it('treats inactive requested benefits as overriding active eligibility', () => {
    const parsed = parse271('EB*1*IND*30**MEDICAID~EB*6*IND*30~');

    expect(parsed.active).toBe(false);
  });

  it('ignores inactive benefits for unrelated service type codes', () => {
    const parsed = parse271('EB*1*IND*30**MEDICAID~EB*6*IND*88~', {
      serviceTypeCodes: ['30'],
    });

    expect(parsed.active).toBe(true);
  });
});
