jest.mock('@medguard360/shared', () => ({
  config: { serviceName: 'eligibility-service' },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  UpstreamError: class UpstreamError extends Error {
    constructor(upstream: string, message: string) {
      super(`${upstream}: ${message}`);
      this.name = 'UpstreamError';
    }
  },
}));

jest.mock('./nctracks', () => ({
  shouldUseNctracks: jest.fn(),
  lookupNctracks: jest.fn(),
}));

import { lookupMmis } from './mmis';
import { lookupNctracks, shouldUseNctracks } from './nctracks';

const mockedShouldUseNctracks = jest.mocked(shouldUseNctracks);
const mockedLookupNctracks = jest.mocked(lookupNctracks);

describe('lookupMmis NCTracks handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails closed when authoritative NCTracks lookup errors', async () => {
    mockedShouldUseNctracks.mockReturnValue(true);
    mockedLookupNctracks.mockRejectedValue(new Error('SOAP endpoint unavailable'));

    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      coverageType: 'medicaid',
      medicaidId: 'NCMD00100001',
    }, '')).rejects.toThrow('nctracks: SOAP endpoint unavailable');
  });
});
