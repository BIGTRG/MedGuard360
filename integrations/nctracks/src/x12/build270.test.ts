import { loadNctracksConfig } from '../config';
import { build270ForNctracks } from './build270';
import type { EligibilityRequest } from '../types';

const request: EligibilityRequest = {
  subscriberId: 'NCMD00100001',
  dateOfService: '2026-07-21',
  serviceTypeCodes: ['98'],
  providerNpi: '1098765432',
  firstName: 'Jane',
  lastName: 'Doe',
  dob: '1980-01-02',
  traceId: 'TRACE-270-001',
};

describe('build270ForNctracks', () => {
  it('emits NCTracks identifiers, subscriber facts, and normalized dates', () => {
    const config = loadNctracksConfig({
      NCTRACKS_SUBMITTER_ID: 'MG360SUBMITTER',
      NCTRACKS_SUBMITTER_QUALIFIER: 'ZZ',
      NCTRACKS_RECEIVER_ID: 'NCXIX',
      NCTRACKS_RECEIVER_QUALIFIER: 'ZZ',
      NCTRACKS_BILLING_NPI: '1234567890',
      NCTRACKS_USAGE_INDICATOR: 'T',
    });

    const payload = build270ForNctracks(request, config, '42');

    expect(payload.startsWith('ISA*')).toBe(true);
    expect(payload).toContain('*MG360SUBMITTER ');
    expect(payload).toContain('*NCXIX          ');
    expect(payload).toContain('GS*HS*MG360SUBMITTER*NCXIX*');
    expect(payload).toContain('ST*270*0001*005010X279A1~');
    expect(payload).toContain('BHT*0022*13*TRACE-270-001*');
    expect(payload).toContain('NM1*PR*2*NC MEDICAID*****PI*NCXIX~');
    expect(payload).toContain('NM1*1P*2*PROVIDER*****XX*1098765432~');
    expect(payload).toContain('NM1*IL*1*Doe*Jane****MI*NCMD00100001~');
    expect(payload).toContain('DMG*D8*19800102*U~');
    expect(payload).toContain('DTP*291*D8*20260721~');
    expect(payload).toContain('EQ*98~');
    expect(payload).toContain('IEA*1*000000042~');
  });

  it('falls back to billing NPI and service type 30 when optional values are absent', () => {
    const config = loadNctracksConfig({ NCTRACKS_BILLING_NPI: '1234567890' });
    const payload = build270ForNctracks({
      subscriberId: 'NCMD00100002',
      dateOfService: '2026-07-21',
      traceId: 'TRACE-DEFAULTS',
    }, config, '7');

    expect(payload).toContain('NM1*1P*2*PROVIDER*****XX*1234567890~');
    expect(payload).toContain('NM1*IL*1*UNKNOWN*UNKNOWN****MI*NCMD00100002~');
    expect(payload).toContain('DMG*D8*19700101*U~');
    expect(payload).toContain('EQ*30~');
    expect(payload).toContain('IEA*1*000000007~');
  });
});
