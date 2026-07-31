const mockStateConfigGet = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: mockStateConfigGet,
    })),
    post: jest.fn(),
  },
}));

jest.mock('./nctracks', () => {
  const actual = jest.requireActual<typeof import('./nctracks')>('./nctracks');
  return {
    ...actual,
    lookupNctracks: jest.fn(),
  };
});

import { lookupMmis } from './mmis';
import { lookupNctracks } from './nctracks';

const mockedLookupNctracks = jest.mocked(lookupNctracks);

describe('lookupMmis NCTracks fallback behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NCTRACKS_MODE;
  });

  it('does not query NCTracks with a placeholder when the Medicaid member ID is missing', async () => {
    mockStateConfigGet.mockResolvedValueOnce({ data: { mmis_api_endpoint: null } });

    const result = await lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
    }, 'Bearer test-token');

    expect(mockedLookupNctracks).not.toHaveBeenCalled();
    expect(result?.active).toBe(false);
    expect(result?.raw).toMatchObject({
      simulated: true,
      source: '270-271-simulator',
      reason: 'No active coverage found',
    });
  });

  it('does not fall through to the generic simulator when NCTracks fails', async () => {
    mockedLookupNctracks.mockRejectedValueOnce(new Error('mTLS handshake failed'));

    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100009',
    }, 'Bearer test-token')).rejects.toThrow('nctracks: mTLS handshake failed');

    expect(mockStateConfigGet).not.toHaveBeenCalled();
  });
});
