import { loadNctracksConfig } from '../config';
import { build270ForNctracks } from './build270';

describe('build270ForNctracks', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-22T10:11:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds a 270 eligibility request with caller supplied member and provider data', () => {
    const config = loadNctracksConfig({
      NCTRACKS_SUBMITTER_ID: 'MG360SUBMITTER',
      NCTRACKS_RECEIVER_ID: 'NCXIX',
      NCTRACKS_BILLING_NPI: '1234567890',
      NCTRACKS_USAGE_INDICATOR: 'T',
    });

    const x12 = build270ForNctracks({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-01',
      serviceTypeCodes: ['98', '30'],
      providerNpi: '1098765432',
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1980-03-04',
      traceId: 'TRACE-270',
    }, config, '42');

    expect(x12).toContain('ISA*00*          *00*          *ZZ*MG360SUBMITTER *ZZ*NCXIX');
    expect(x12).toContain('GS*HS*MG360SUBMITTER*NCXIX*20260722*1011*42*X*005010X279A1~');
    expect(x12).toContain('BHT*0022*13*TRACE-270*20260722*1011~');
    expect(x12).toContain('NM1*1P*2*PROVIDER*****XX*1098765432~');
    expect(x12).toContain('NM1*IL*1*Doe*Jane****MI*NCMD00100001~');
    expect(x12).toContain('DMG*D8*19800304*U~');
    expect(x12).toContain('DTP*291*D8*20260701~');
    expect(x12).toContain('EQ*98~');
    expect(x12).toContain('SE*14*0001~');
    expect(x12).toContain('IEA*1*000000042~');
  });

  it('uses deterministic safe defaults when optional request fields are absent', () => {
    const config = loadNctracksConfig({
      NCTRACKS_BILLING_NPI: '1234567890',
    });

    const x12 = build270ForNctracks({
      subscriberId: 'NCMD00100009',
      dateOfService: '',
    }, config, '7');

    expect(x12).toContain('BHT*0022*13*MG-1784715060000*20260722*1011~');
    expect(x12).toContain('NM1*1P*2*PROVIDER*****XX*1234567890~');
    expect(x12).toContain('NM1*IL*1*UNKNOWN*UNKNOWN****MI*NCMD00100009~');
    expect(x12).toContain('DMG*D8*19700101*U~');
    expect(x12).toContain('DTP*291*D8*20260722~');
    expect(x12).toContain('EQ*30~');
    expect(x12).toContain('GE*1*7~');
  });
});
