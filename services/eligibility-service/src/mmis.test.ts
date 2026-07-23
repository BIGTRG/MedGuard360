const checkEligibility = jest.fn();

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: () => ({
    mode: 'soap',
    checkEligibility,
  }),
}));

import { lookupMmis } from './mmis';

describe('lookupMmis NCTracks routing', () => {
  const originalMode = process.env.NCTRACKS_MODE;

  beforeEach(() => {
    process.env.NCTRACKS_MODE = 'soap';
    checkEligibility.mockReset();
  });

  afterAll(() => {
    if (originalMode === undefined) {
      delete process.env.NCTRACKS_MODE;
    } else {
      process.env.NCTRACKS_MODE = originalMode;
    }
  });

  it('propagates NCTracks failures instead of falling back to generic MMIS', async () => {
    checkEligibility.mockRejectedValueOnce(new Error('SOAP outage'));

    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100001',
    }, 'Bearer test-token')).rejects.toThrow('SOAP outage');
  });
});
