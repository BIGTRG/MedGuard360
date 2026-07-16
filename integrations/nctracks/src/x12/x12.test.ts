import { loadNctracksConfig } from '../config';
import type { EligibilityRequest } from '../types';
import { build270ForNctracks } from './build270';
import { parse271 } from './parse271';

describe('build270ForNctracks', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-16T10:02:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('builds a deterministic NCTracks 270 using request and configured identifiers', () => {
    const config = loadNctracksConfig({
      NCTRACKS_SUBMITTER_ID: 'SUBMITTER01',
      NCTRACKS_SUBMITTER_QUALIFIER: 'ZZ',
      NCTRACKS_RECEIVER_ID: 'NCXIX',
      NCTRACKS_RECEIVER_QUALIFIER: 'ZZ',
      NCTRACKS_BILLING_NPI: '1987654321',
      NCTRACKS_USAGE_INDICATOR: 'T',
    });
    const request: EligibilityRequest = {
      subscriberId: '987654321A',
      dateOfService: '2026-07-20',
      dob: '1980-02-03',
      firstName: 'Jane',
      lastName: 'Doe',
      providerNpi: '1234567893',
      serviceTypeCodes: ['47'],
      traceId: 'TRACE-270',
    };

    const x12 = build270ForNctracks(request, config, '42');
    const segments = x12.split('\n');

    expect(segments).toEqual([
      'ISA*00*          *00*          *ZZ*SUBMITTER01    *ZZ*NCXIX          *260716*1002*^*00501*000000042*0*T*:~',
      'GS*HS*SUBMITTER01*NCXIX*20260716*1002*42*X*005010X279A1~',
      'ST*270*0001*005010X279A1~',
      'BHT*0022*13*TRACE-270*20260716*1002~',
      'HL*1**20*1~',
      'NM1*PR*2*NC MEDICAID*****PI*NCXIX~',
      'HL*2*1*21*1~',
      'NM1*1P*2*PROVIDER*****XX*1234567893~',
      'HL*3*2*22*0~',
      'NM1*IL*1*Doe*Jane****MI*987654321A~',
      'DMG*D8*19800203*U~',
      'DTP*291*D8*20260720~',
      'EQ*47~',
      'SE*14*0001~',
      'GE*1*42~',
      'IEA*1*000000042~',
    ]);
  });

  it('uses safe eligibility defaults when optional patient fields are absent', () => {
    const config = loadNctracksConfig({
      NCTRACKS_SUBMITTER_ID: 'SUBMITTER01',
      NCTRACKS_RECEIVER_ID: 'NCXIX',
      NCTRACKS_BILLING_NPI: '1987654321',
    });
    const request: EligibilityRequest = {
      subscriberId: '123456789B',
      dateOfService: '',
      traceId: 'TRACE-DEFAULTS',
    };

    const x12 = build270ForNctracks(request, config, '7');

    expect(x12).toContain('NM1*1P*2*PROVIDER*****XX*1987654321~');
    expect(x12).toContain('NM1*IL*1*UNKNOWN*UNKNOWN****MI*123456789B~');
    expect(x12).toContain('DMG*D8*19700101*U~');
    expect(x12).toContain('DTP*291*D8*20260716~');
    expect(x12).toContain('EQ*30~');
  });
});

describe('parse271', () => {
  it('extracts active coverage details from a 271 response', () => {
    const parsed = parse271([
      'ISA*00*~',
      'EB*1**30**MEDICAID DIRECT**3.50~',
      'DTP*291*D8*20260701~',
      'DTP*292*D8*20261231~',
    ].join('\n'));

    expect(parsed).toEqual({
      active: true,
      planName: 'MEDICAID DIRECT',
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-12-31',
      copay: 3.5,
    });
  });

  it('returns AAA rejection metadata without marking coverage active', () => {
    const parsed = parse271('AAA*N**72*C~');

    expect(parsed).toEqual({
      active: false,
      aaaCode: '72',
    });
  });

  it('ignores malformed DTP dates instead of exposing partial dates', () => {
    const parsed = parse271('EB*1**30**MEDICAID DIRECT~DTP*291*D8*202607~');

    expect(parsed).toEqual({
      active: true,
      planName: 'MEDICAID DIRECT',
    });
  });
});
