jest.mock('./nctracks', () => ({
  lookupNctracks: jest.fn(),
  shouldUseNctracks: jest.fn(),
}));

import { lookupMmis } from './mmis';
import { lookupNctracks, shouldUseNctracks } from './nctracks';

const mockedLookupNctracks = jest.mocked(lookupNctracks);
const mockedShouldUseNctracks = jest.mocked(shouldUseNctracks);

describe('lookupMmis NCTracks fail-closed behavior', () => {
  beforeEach(() => {
    mockedLookupNctracks.mockReset();
    mockedShouldUseNctracks.mockReset();
  });

  it('rethrows authoritative NCTracks failures instead of falling back to simulator', async () => {
    mockedShouldUseNctracks.mockReturnValue(true);
    mockedLookupNctracks.mockRejectedValue(new Error('SOAP transport unavailable'));

    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100001',
    }, 'Bearer token')).rejects.toThrow('SOAP transport unavailable');
  });
});
