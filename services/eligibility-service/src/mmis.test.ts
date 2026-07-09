import axios from 'axios';
import { lookupMmis } from './mmis';
import { lookupNctracks, shouldUseNctracks } from './nctracks';

const mockStateConfigGet = jest.fn();
const mockAxiosPost = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({ get: mockStateConfigGet })),
    post: mockAxiosPost,
  },
}));

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
  lookupNctracks: jest.fn(),
  shouldUseNctracks: jest.fn(),
}));

const mockedLookupNctracks = jest.mocked(lookupNctracks);
const mockedShouldUseNctracks = jest.mocked(shouldUseNctracks);
const mockedAxios = jest.mocked(axios);

describe('lookupMmis NCTracks orchestration', () => {
  beforeEach(() => {
    mockStateConfigGet.mockReset();
    mockAxiosPost.mockReset();
    mockedLookupNctracks.mockReset();
    mockedShouldUseNctracks.mockReset();
    mockedShouldUseNctracks.mockReturnValue(true);
  });

  it('falls back to the generic simulator when NCTracks fails and no MMIS endpoint is configured', async () => {
    mockedLookupNctracks.mockRejectedValue(new Error('NCTracks unavailable'));
    mockStateConfigGet.mockResolvedValue({ data: { mmis_api_endpoint: null } });

    const result = await lookupMmis({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'MID000001',
    }, 'Bearer test-token');

    expect(mockedLookupNctracks).toHaveBeenCalledWith({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'MID000001',
    });
    expect(mockStateConfigGet).toHaveBeenCalledWith(
      '/state-config/states/NC',
      { headers: { authorization: 'Bearer test-token' } },
    );
    expect(result?.active).toBe(true);
    expect(result?.raw).toMatchObject({
      simulated: true,
      source: '270-271-simulator',
      payer_id: 'NCXIX',
    });
  });

  it('does not call NCTracks for non-NC states and returns inactive simulator coverage for invalid member IDs', async () => {
    mockedShouldUseNctracks.mockReturnValue(false);
    mockStateConfigGet.mockResolvedValue({ data: { mmis_api_endpoint: null } });

    const result = await lookupMmis({
      stateCode: 'SC',
      payerId: 'SCXIX',
      medicaidId: 'BAD',
    }, 'Bearer test-token');

    expect(mockedLookupNctracks).not.toHaveBeenCalled();
    expect(result?.active).toBe(false);
    expect(result?.raw).toMatchObject({
      simulated: true,
      source: '270-271-simulator',
      payer_id: 'SCXIX',
      reason: 'No active coverage found',
    });
  });

  it('uses a configured endpoint first but falls back to deterministic simulator on X12 submit failure', async () => {
    mockedShouldUseNctracks.mockReturnValue(false);
    mockStateConfigGet.mockResolvedValue({ data: { mmis_api_endpoint: 'https://mmis.example.test/270' } });
    mockedAxios.post.mockRejectedValue(new Error('connection refused'));

    const result = await lookupMmis({
      stateCode: 'GA',
      payerId: 'GAXIX',
      medicaidId: 'MID000002',
      patientFirstName: 'Jane',
      patientLastName: 'Doe',
      patientDateOfBirth: '1980-01-31',
    }, 'Bearer test-token');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://mmis.example.test/270',
      expect.stringContaining('ISA*'),
      expect.objectContaining({
        headers: { 'content-type': 'application/edi-x12' },
        timeout: 15_000,
      }),
    );
    expect(result?.active).toBe(true);
    expect(result?.raw.source).toBe('270-271-simulator');
  });
});
