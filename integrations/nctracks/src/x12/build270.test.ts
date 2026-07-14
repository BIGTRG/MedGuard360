import { build270ForNctracks } from './build270';
import type { EligibilityRequest, NctracksConfig } from '../types';

const config: NctracksConfig = {
  mode: 'soap',
  env: 'test',
  realtime: {
    eligibilityUrl: 'https://edi.example.com/CORE/Eligibility',
    claimStatusUrl: '',
    timeoutMs: 30_000,
  },
  batch: {},
  identifiers: {
    tpid: 'TPID-1',
    submitterId: 'SUBMITTER1',
    submitterQualifier: 'ZZ',
    receiverId: 'NCXIX',
    receiverQualifier: 'ZZ',
    billingNpi: '1234567890',
    billingTaxonomy: '207Q00000X',
    usageIndicator: 'P',
  },
  auth: {
    clientCertPem: 'cert',
    clientKeyPem: 'key',
  },
};

const eligibilityRequest: EligibilityRequest = {
  subscriberId: 'NCMD00100007',
  dateOfService: '2026-05-22',
  serviceTypeCodes: ['98'],
  providerNpi: '1999999999',
  firstName: 'Jane',
  lastName: 'Doe',
  dob: '1984-02-03',
  traceId: 'TRACE-270',
};

describe('build270ForNctracks', () => {
  it('builds a 270 using NCTracks submitter, receiver, provider, and subscriber identifiers', () => {
    const payload = build270ForNctracks(eligibilityRequest, config, '42');

    expect(payload.split('\n')[0]).toContain('SUBMITTER1');
    expect(payload.split('\n')[0]).toContain('NCXIX');
    expect(payload.split('\n')[0]).toContain('*000000042*0*P*');
    expect(payload).toContain('GS*HS*SUBMITTER1*NCXIX*');
    expect(payload).toContain('BHT*0022*13*TRACE-270*');
    expect(payload).toContain('NM1*1P*2*PROVIDER*****XX*1999999999~');
    expect(payload).toContain('NM1*IL*1*Doe*Jane****MI*NCMD00100007~');
  });

  it('normalizes service and birth dates while preserving the requested service type', () => {
    const payload = build270ForNctracks(eligibilityRequest, config, '42');

    expect(payload).toContain('DMG*D8*19840203*U~');
    expect(payload).toContain('DTP*291*D8*20260522~');
    expect(payload).toContain('EQ*98~');
  });

  it('falls back to billing NPI and service type 30 when optional fields are absent', () => {
    const payload = build270ForNctracks({
      subscriberId: 'NCMD00100007',
      dateOfService: '2026-05-22',
      traceId: 'TRACE-DEFAULTS',
    }, config, '7');

    expect(payload).toContain('NM1*1P*2*PROVIDER*****XX*1234567890~');
    expect(payload).toContain('NM1*IL*1*UNKNOWN*UNKNOWN****MI*NCMD00100007~');
    expect(payload).toContain('DMG*D8*19700101*U~');
    expect(payload).toContain('EQ*30~');
    expect(payload).toContain('IEA*1*000000007~');
  });
});
