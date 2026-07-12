import { loadNctracksConfig } from '../config';
import type { EligibilityRequest } from '../types';
import { build270ForNctracks } from './build270';
import { parse271 } from './parse271';

function x12Segments(payload: string): string[] {
  return payload.split(/[~\n\r]+/).filter(Boolean);
}

describe('build270ForNctracks', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-12T10:15:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('emits the expected 270 envelope, subscriber, and requested service segments', () => {
    const config = loadNctracksConfig({
      NCTRACKS_SUBMITTER_ID: 'SUBMITTER',
      NCTRACKS_RECEIVER_ID: 'NCXIX',
      NCTRACKS_BILLING_NPI: '1234567890',
      NCTRACKS_USAGE_INDICATOR: 'T',
    });
    const request: EligibilityRequest = {
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-05-22',
      serviceTypeCodes: ['98'],
      providerNpi: '1098765432',
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1981-04-05',
      traceId: 'TRACE-270-1',
    };

    const payload = build270ForNctracks(request, config, '42');
    const segments = x12Segments(payload);

    expect(segments[0]).toContain('*00501*000000042*0*T*:');
    expect(segments).toContain('GS*HS*SUBMITTER*NCXIX*20260712*1015*42*X*005010X279A1');
    expect(segments).toContain('ST*270*0001*005010X279A1');
    expect(segments).toContain('BHT*0022*13*TRACE-270-1*20260712*1015');
    expect(segments).toContain('NM1*1P*2*PROVIDER*****XX*1098765432');
    expect(segments).toContain('NM1*IL*1*Doe*Jane****MI*NCMD00100001');
    expect(segments).toContain('DMG*D8*19810405*U');
    expect(segments).toContain('DTP*291*D8*20260522');
    expect(segments).toContain('EQ*98');
    expect(segments).toContain('IEA*1*000000042');
  });
});

describe('parse271', () => {
  it('maps active EB coverage details into eligibility fields', () => {
    const parsed = parse271('EB*1*IND*30*MC*Carolina Complete Health**12.5~');

    expect(parsed).toEqual({
      active: true,
      planName: 'Carolina Complete Health',
      copay: 12.5,
    });
  });

  it('keeps AAA rejection responses inactive and exposes the rejection code', () => {
    const parsed = parse271('AAA*N**75*C~');

    expect(parsed).toEqual({
      active: false,
      aaaCode: '75',
    });
  });

  it('normalizes 291 and 292 DTP dates to ISO coverage dates', () => {
    const parsed = parse271('DTP*291*D8*20260115~DTP*292*D8*20261231~');

    expect(parsed).toEqual({
      active: false,
      effectiveFrom: '2026-01-15',
      effectiveTo: '2026-12-31',
    });
  });
});
