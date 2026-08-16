import { lookupMmis } from './mmis';

describe('lookupMmis NCTracks fail-closed behavior', () => {
  it('rejects NC Medicaid checks without a real recipient ID instead of falling back', async () => {
    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
    }, '')).rejects.toThrow('real NC Medicaid recipient ID');
  });
});
