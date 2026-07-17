import { loadNctracksConfig } from '../config';
import { build270ForNctracks } from './build270';
import type { EligibilityRequest, NctracksConfig } from '../types';

function config(): NctracksConfig {
  return loadNctracksConfig({
    NCTRACKS_SUBMITTER_ID: 'TP12345',
    NCTRACKS_RECEIVER_ID: 'NCXIX',
    NCTRACKS_BILLING_NPI: '1112223333',
    NCTRACKS_USAGE_INDICATOR: 'T',
  });
}

describe('build270ForNctracks', () => {
  it('places subscriber, provider, date, DOB, trace, and service type into the 270', () => {
    const req: EligibilityRequest = {
      subscriberId: 'NCMD00100007',
      dateOfService: '2026-07-15',
      serviceTypeCodes: ['98'],
      providerNpi: '1234567893',
      firstName: 'JANE',
      lastName: 'DOE',
      dob: '1985-05-10',
      traceId: 'TRACE-270-1',
    };

    const x12 = build270ForNctracks(req, config(), '42');

    expect(x12).toContain('ST*270*0001*005010X279A1~');
    expect(x12).toContain('BHT*0022*13*TRACE-270-1*');
    expect(x12).toContain('NM1*1P*2*PROVIDER*****XX*1234567893~');
    expect(x12).toContain('NM1*IL*1*DOE*JANE****MI*NCMD00100007~');
    expect(x12).toContain('DMG*D8*19850510*U~');
    expect(x12).toContain('DTP*291*D8*20260715~');
    expect(x12).toContain('EQ*98~');
    expect(x12).toContain('IEA*1*000000042~');
  });

  it('uses safe eligibility defaults when optional request fields are absent', () => {
    const req: EligibilityRequest = {
      subscriberId: 'NCMD00100001',
      dateOfService: '',
      traceId: 'TRACE-DEFAULTS',
    };

    const x12 = build270ForNctracks(req, config(), '7');

    expect(x12).toContain('BHT*0022*13*TRACE-DEFAULTS*');
    expect(x12).toContain('NM1*1P*2*PROVIDER*****XX*1112223333~');
    expect(x12).toContain('NM1*IL*1*UNKNOWN*UNKNOWN****MI*NCMD00100001~');
    expect(x12).toContain('DMG*D8*19700101*U~');
    expect(x12).toContain('EQ*30~');
    expect(x12).toContain('IEA*1*000000007~');
  });
});
