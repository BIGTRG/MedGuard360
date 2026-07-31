import { lookupMmis } from './mmis';

describe('lookupMmis NCTracks fallback handling', () => {
  afterEach(() => {
    delete process.env.NCTRACKS_MODE;
    delete process.env.NCTRACKS_REALTIME_ELIGIBILITY_URL;
    delete process.env.NCTRACKS_CLIENT_CERT;
    delete process.env.NCTRACKS_CLIENT_KEY;
  });

  it('does not fall back to the generic simulator when NCTracks config fails', async () => {
    process.env.NCTRACKS_MODE = 'soap';

    const result = await lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100001',
    }, 'Bearer test-token');

    expect(result).toBeNull();
  });

  it('does not simulate active NC Medicaid coverage when the member ID is missing', async () => {
    const result = await lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
    }, 'Bearer test-token');

    expect(result).toBeNull();
  });
});
