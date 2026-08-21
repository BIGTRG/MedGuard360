jest.mock('./nctracks', () => ({
  lookupNctracks: jest.fn(),
  shouldUseNctracks: jest.fn(),
}));

import { lookupMmis } from './mmis';
import { lookupNctracks, shouldUseNctracks } from './nctracks';

const mockedLookupNctracks = jest.mocked(lookupNctracks);
const mockedShouldUseNctracks = jest.mocked(shouldUseNctracks);

describe('lookupMmis', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('propagates NCTracks failures instead of falling back to generic MMIS', async () => {
    mockedShouldUseNctracks.mockReturnValue(true);
    mockedLookupNctracks.mockRejectedValue(new Error('NCTracks unavailable'));

    await expect(
      lookupMmis(
        {
          stateCode: 'NC',
          payerId: 'NCXIX',
          coverageType: 'medicaid',
          medicaidId: 'NCMD00100001',
        },
        '',
      ),
    ).rejects.toThrow('NCTracks unavailable');
  });
});
