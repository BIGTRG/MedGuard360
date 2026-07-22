const mockStateConfigGet = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({ get: mockStateConfigGet })),
  },
}));

jest.mock('@medguard360/shared', () => {
  class UpstreamError extends Error {
    public readonly status = 502;
    public readonly code = 'UPSTREAM_ERROR';

    constructor(upstream: string, message: string) {
      super(`${upstream}: ${message}`);
      this.name = 'UpstreamError';
    }
  }

  return {
    config: { serviceName: 'eligibility-service' },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    UpstreamError,
  };
});

jest.mock('./nctracks', () => ({
  lookupNctracks: jest.fn(),
  shouldUseNctracks: jest.fn(),
}));

import { lookupMmis } from './mmis';
import { lookupNctracks, shouldUseNctracks } from './nctracks';

const mockedLookupNctracks = jest.mocked(lookupNctracks);
const mockedShouldUseNctracks = jest.mocked(shouldUseNctracks);

describe('lookupMmis NCTracks routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails closed when authoritative NCTracks eligibility lookup fails', async () => {
    mockedShouldUseNctracks.mockReturnValue(true);
    mockedLookupNctracks.mockRejectedValue(new Error('CORE SOAP response rejected'));

    await expect(lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      patientFirstName: 'Jane',
      patientLastName: 'Doe',
      medicaidId: 'NCMD00100001',
    }, 'Bearer token')).rejects.toThrow('nctracks: CORE SOAP response rejected');

    expect(mockStateConfigGet).not.toHaveBeenCalled();
  });
});
