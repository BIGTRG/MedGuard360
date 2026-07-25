import { lookupMmis } from './mmis';

describe('lookupMmis NCTracks fail-closed behavior', () => {
  const originalMode = process.env.NCTRACKS_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.NCTRACKS_MODE;
    } else {
      process.env.NCTRACKS_MODE = originalMode;
    }
  });

  it('does not fall back to the simulator when NCTracks is selected but unavailable', async () => {
    process.env.NCTRACKS_MODE = 'soap';

    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100001',
    }, 'Bearer test-token')).rejects.toThrow('NctracksConfigError');
  });
});
