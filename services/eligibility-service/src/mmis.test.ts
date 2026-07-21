import { createNctracksAdapter, type NctracksAdapter } from '@medguard360/nctracks';
import { lookupMmis } from './mmis';

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(),
}));

const mockedCreateNctracksAdapter = createNctracksAdapter as jest.MockedFunction<typeof createNctracksAdapter>;

function adapterThatRejectsEligibility(): NctracksAdapter {
  return {
    mode: 'soap',
    checkEligibility: async () => {
      throw new Error('SOAP fault');
    },
    submitClaim: async () => {
      throw new Error('not used');
    },
    getClaimStatus: async () => {
      throw new Error('not used');
    },
    retrieveRemittances: async () => {
      throw new Error('not used');
    },
    pollAcks: async () => {
      throw new Error('not used');
    },
    healthCheck: async () => ({ realtimeOk: false, sftpOk: false }),
  };
}

describe('lookupMmis', () => {
  afterEach(() => {
    mockedCreateNctracksAdapter.mockReset();
    delete process.env.NCTRACKS_MODE;
  });

  it('does not fall back to simulated active coverage when NCTracks fails', async () => {
    mockedCreateNctracksAdapter.mockReturnValue(adapterThatRejectsEligibility());

    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100001',
    }, 'Bearer test')).rejects.toMatchObject({
      name: 'AuthoritativeMmisError',
      code: 'UPSTREAM_ERROR',
      message: 'nctracks: SOAP fault',
    });
  });
});
