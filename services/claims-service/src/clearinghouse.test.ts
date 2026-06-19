import {
  activeClearinghouse,
  parse277CA,
  parse835,
  parse999,
  submit837P,
} from './clearinghouse';

const sampleIsa = 'ISA*00*          *00*          *ZZ*MEDGUARD360    *ZZ*NCMEDPAY       *260517*1200*^*00501*000000001*0*P*:~';

describe('activeClearinghouse', () => {
  it('defaults to stub', () => {
    expect(activeClearinghouse()).toBe('stub');
  });
});

describe('submit837P', () => {
  it('accepts stub submissions', async () => {
    const result = await submit837P(sampleIsa, 'NCMEDPAY');
    expect(result.ok).toBe(true);
    expect(result.clearinghouse).toBe('stub');
    expect(result.vendorSubmissionId.length).toBeGreaterThan(0);
  });
});

describe('acknowledgment parsers', () => {
  it('parse999 detects acceptance', () => {
    const parsed = parse999('AK9*A*1*1*1~');
    expect(parsed.accepted).toBe(true);
  });

  it('parse277CA extracts claim statuses', () => {
    const parsed = parse277CA('TRN*2*260517-000001~STC*A1:19*20260510~');
    expect(parsed.length).toBe(1);
    expect(parsed[0].claimControlNumber).toBe('260517-000001');
  });

  it('parse835 extracts payment rows', () => {
    const parsed = parse835('CLP*260517-000001*1*150*120*~');
    expect(parsed.length).toBeGreaterThanOrEqual(1);
  });
});