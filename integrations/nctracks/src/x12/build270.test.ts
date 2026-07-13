import { build270ForNctracks } from './build270';
import type { NctracksConfig } from '../types';

const config: NctracksConfig = {
  mode: 'soap',
  env: 'test',
  realtime: {
    eligibilityUrl: 'https://edi.example.com/CORE/Eligibility',
    claimStatusUrl: 'https://edi.example.com/CORE/ClaimStatus',
    timeoutMs: 30_000,
  },
  batch: {},
  identifiers: {
    tpid: 'TPID',
    submitterId: 'SUBMITTER',
    submitterQualifier: 'ZZ',
    receiverId: 'RECEIVER',
    receiverQualifier: 'ZZ',
    billingNpi: '9876543210',
    billingTaxonomy: '207Q00000X',
    usageIndicator: 'T',
  },
  auth: {
    clientCertPem: 'cert',
    clientKeyPem: 'key',
  },
};

describe('build270ForNctracks', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-13T14:05:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds deterministic 270 control, subscriber, and service-date segments', () => {
    const x12 = build270ForNctracks({
      subscriberId: 'NCMD00100007',
      dateOfService: '2026-07-10',
      serviceTypeCodes: ['30'],
      providerNpi: '1234567890',
      firstName: 'Ada',
      lastName: 'Lovelace',
      dob: '1980-02-03',
      traceId: 'TRACE-270',
    }, config, '42');

    expect(x12).toContain(
      'ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       *260713*1405*^*00501*000000042*0*T*:~',
    );
    expect(x12).toContain('BHT*0022*13*TRACE-270*20260713*1405~');
    expect(x12).toContain('NM1*1P*2*PROVIDER*****XX*1234567890~');
    expect(x12).toContain('NM1*IL*1*Lovelace*Ada****MI*NCMD00100007~');
    expect(x12).toContain('DMG*D8*19800203*U~');
    expect(x12).toContain('DTP*291*D8*20260710~');
    expect(x12).toContain('EQ*30~');
    expect(x12).toContain('IEA*1*000000042~');
  });
});
