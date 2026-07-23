import { parse271 } from './parse271';

describe('parse271', () => {
  it('extracts active coverage, plan description, benefit dates, and copay', () => {
    const payload = [
      'ISA*00*~',
      'ST*271*0001~',
      'EB*1*IND*30**STANDARD PLAN**25~',
      'DTP*291*D8*20260501~',
      'DTP*292*D8*20261231~',
      'SE*5*0001~',
    ].join('\n');

    expect(parse271(payload)).toEqual({
      active: true,
      planName: 'STANDARD PLAN',
      effectiveFrom: '2026-05-01',
      effectiveTo: '2026-12-31',
      copay: 25,
    });
  });

  it('captures AAA rejection codes and marks coverage inactive', () => {
    const payload = [
      'ST*271*0001~',
      'EB*1*IND*30**STANDARD PLAN~',
      'AAA*Y**75*C~',
      'SE*4*0001~',
    ].join('\n');

    expect(parse271(payload)).toMatchObject({
      active: false,
      planName: 'STANDARD PLAN',
      aaaCode: '75',
    });
  });

  it('does not treat non-active EB statuses as active coverage', () => {
    const payload = [
      'ST*271*0001~',
      'EB*6*IND*30**INACTIVE PLAN**10~',
      'SE*3*0001~',
    ].join('\n');

    expect(parse271(payload)).toEqual({
      active: false,
      planName: 'INACTIVE PLAN',
      copay: 10,
    });
  });
});
