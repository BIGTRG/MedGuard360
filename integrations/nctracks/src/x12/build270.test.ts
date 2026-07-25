import { loadNctracksConfig } from '../config';
import { build270ForNctracks } from './build270';

describe('build270ForNctracks', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-25T10:02:13.580Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds a deterministic NCTracks 270 with configured identifiers and request data', () => {
    const cfg = loadNctracksConfig({
      NCTRACKS_SUBMITTER_ID: 'SUBMITTER',
      NCTRACKS_RECEIVER_ID: 'NCXIX',
      NCTRACKS_BILLING_NPI: '1234567890',
      NCTRACKS_BILLING_TAXONOMY: '207Q00000X',
      NCTRACKS_USAGE_INDICATOR: 'T',
    });

    const x12 = build270ForNctracks({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-24',
      serviceTypeCodes: ['98'],
      providerNpi: '1098765432',
      firstName: 'Ada',
      lastName: 'Lovelace',
      dob: '1985-04-12',
      traceId: 'TRACE-1',
    }, cfg, '42');

    expect(x12).toContain('ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*NCXIX          *260725*1002*^*00501*000000042*0*T*:~');
    expect(x12).toContain('GS*HS*SUBMITTER*NCXIX*20260725*1002*42*X*005010X279A1~');
    expect(x12).toContain('BHT*0022*13*TRACE-1*20260725*1002~');
    expect(x12).toContain('NM1*1P*2*PROVIDER*****XX*1098765432~');
    expect(x12).toContain('NM1*IL*1*Lovelace*Ada****MI*NCMD00100001~');
    expect(x12).toContain('DMG*D8*19850412*U~');
    expect(x12).toContain('DTP*291*D8*20260724~');
    expect(x12).toContain('EQ*98~');
    expect(x12).toContain('IEA*1*000000042~');
  });

  it('falls back to safe request defaults when optional values are absent', () => {
    const cfg = loadNctracksConfig({});

    const x12 = build270ForNctracks({
      subscriberId: 'NCMD00100002',
      dateOfService: '',
    }, cfg, '7');

    expect(x12).toContain('BHT*0022*13*MG-1784973733580*20260725*1002~');
    expect(x12).toContain('NM1*1P*2*PROVIDER*****XX*0000000000~');
    expect(x12).toContain('NM1*IL*1*UNKNOWN*UNKNOWN****MI*NCMD00100002~');
    expect(x12).toContain('DMG*D8*19700101*U~');
    expect(x12).toContain('DTP*291*D8*20260725~');
    expect(x12).toContain('EQ*30~');
  });
});
