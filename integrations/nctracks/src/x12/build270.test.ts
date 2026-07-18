import { loadNctracksConfig } from '../config';
import type { NctracksConfig } from '../types';
import { build270ForNctracks } from './build270';

function testConfig(): NctracksConfig {
  return loadNctracksConfig({
    NCTRACKS_SUBMITTER_ID: 'SUBMITTER123456789',
    NCTRACKS_RECEIVER_ID: 'NCXIX',
    NCTRACKS_BILLING_NPI: '1234567890',
    NCTRACKS_USAGE_INDICATOR: 'T',
  });
}

function segments(payload: string): string[] {
  return payload.split(/[~\n]+/).filter(Boolean);
}

describe('build270ForNctracks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-18T10:02:23.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds a deterministic 270 with patient, provider, service date, and service type data', () => {
    const payload = build270ForNctracks({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-06',
      serviceTypeCodes: ['98'],
      providerNpi: '9876543210',
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1980-04-05',
      traceId: 'TRACE-270-1',
    }, testConfig(), '42');

    const builtSegments = segments(payload);

    expect(builtSegments).toContain('GS*HS*SUBMITTER123456789*NCXIX*20260718*1002*42*X*005010X279A1');
    expect(builtSegments).toContain('BHT*0022*13*TRACE-270-1*20260718*1002');
    expect(builtSegments).toContain('NM1*1P*2*PROVIDER*****XX*9876543210');
    expect(builtSegments).toContain('NM1*IL*1*Doe*Jane****MI*NCMD00100001');
    expect(builtSegments).toContain('DMG*D8*19800405*U');
    expect(builtSegments).toContain('DTP*291*D8*20260706');
    expect(builtSegments).toContain('EQ*98');
    expect(builtSegments).toContain('IEA*1*000000042');
  });

  it('uses safe defaults when optional demographics and request trace are absent', () => {
    const payload = build270ForNctracks({
      subscriberId: 'NCMD00100002',
      dateOfService: '',
    }, testConfig(), '7');

    const builtSegments = segments(payload);

    expect(builtSegments).toContain('BHT*0022*13*MG-1784368943000*20260718*1002');
    expect(builtSegments).toContain('NM1*1P*2*PROVIDER*****XX*1234567890');
    expect(builtSegments).toContain('NM1*IL*1*UNKNOWN*UNKNOWN****MI*NCMD00100002');
    expect(builtSegments).toContain('DMG*D8*19700101*U');
    expect(builtSegments).toContain('DTP*291*D8*20260718');
    expect(builtSegments).toContain('EQ*30');
  });
});
