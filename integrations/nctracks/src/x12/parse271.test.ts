import { parse271 } from './parse271';

describe('parse271', () => {
  it('returns inactive with AAA rejection details', () => {
    expect(parse271('ISA*00*~AAA*N**75*C~')).toEqual({
      active: false,
      aaaCode: '75',
    });
  });

  it('marks EB eligibility code 1 active and captures the first plan name', () => {
    expect(parse271('EB*1**30**MEDICAID~EB*1**98**IGNORED~')).toMatchObject({
      active: true,
      planName: 'MEDICAID',
    });
  });

  it('lets a later AAA rejection override an earlier active EB segment', () => {
    expect(parse271('EB*1**30**MEDICAID~AAA*N**72*C~')).toMatchObject({
      active: false,
      aaaCode: '72',
      planName: 'MEDICAID',
    });
  });

  it('normalizes DTP 291 and 292 D8 dates to ISO dates', () => {
    expect(parse271('DTP*291*D8*20260701\nDTP*292*D8*20260731\r')).toMatchObject({
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-07-31',
    });
  });

  it('extracts copay from service type 30 EB segment', () => {
    expect(parse271('EB*1**98**VISION**12.50~EB*1**30**MEDICAID**3.25~')).toMatchObject({
      active: true,
      planName: 'VISION',
      copay: 3.25,
    });
  });

  it('ignores empty and malformed segments without changing defaults', () => {
    expect(parse271('~\nBAD\rEB**')).toEqual({ active: false });
  });
});
