import { parse271 } from './parse271';

describe('parse271', () => {
  it('does not treat active non-health-plan benefits as active plan coverage', () => {
    const parsed = parse271('EB*6*IND*30~EB*1*IND*88~');

    expect(parsed.active).toBe(false);
  });

  it('keeps AAA rejection authoritative even when a later EB segment is active', () => {
    const parsed = parse271('AAA*N**75*C~EB*1*IND*30~');

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('75');
  });

  it('reports active coverage for health benefit plan active segments', () => {
    const parsed = parse271('EB*1*IND*30~');

    expect(parsed.active).toBe(true);
  });
});
