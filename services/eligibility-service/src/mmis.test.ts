import { lookupMmis, type MmisLookupInput, type MmisLookupResult } from './mmis';
import { lookupNctracks, shouldUseNctracks } from './nctracks';

const mockStateConfigGet = jest.fn();

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: mockStateConfigGet,
  })),
  post: jest.fn(),
}));

jest.mock('./nctracks', () => ({
  lookupNctracks: jest.fn(),
  shouldUseNctracks: jest.fn(),
}));

const mockedLookupNctracks = jest.mocked(lookupNctracks);
const mockedShouldUseNctracks = jest.mocked(shouldUseNctracks);

const baseInput: MmisLookupInput = {
  stateCode: 'NC',
  payerId: 'NCXIX',
  patientFirstName: 'Jane',
  patientLastName: 'Doe',
  patientDateOfBirth: '1980-05-12',
  medicaidId: 'NCMD00100001',
};

describe('lookupMmis NCTracks routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns NCTracks results directly for NC checks without calling state-config', async () => {
    const nctracksResult: MmisLookupResult = {
      active: true,
      effectiveFrom: '2026-01-01',
      planName: 'Healthy Blue',
      copayCents: 0,
      deductibleRemainingCents: 0,
      source: 'nctracks_270_271',
      raw: {
        source: 'nctracks',
        traceId: 'TRACE-123',
      },
    };
    mockedShouldUseNctracks.mockReturnValue(true);
    mockedLookupNctracks.mockResolvedValue(nctracksResult);

    await expect(lookupMmis(baseInput, 'Bearer test-token')).resolves.toBe(nctracksResult);

    expect(mockedLookupNctracks).toHaveBeenCalledWith(baseInput);
    expect(mockStateConfigGet).not.toHaveBeenCalled();
  });

  it('falls back to the generic MMIS path when NCTracks throws', async () => {
    mockedShouldUseNctracks.mockReturnValue(true);
    mockedLookupNctracks.mockRejectedValue(new Error('NCTracks unavailable'));
    mockStateConfigGet.mockResolvedValue({ data: { mmis_api_endpoint: null } });

    const result = await lookupMmis(baseInput, 'Bearer fallback-token');

    expect(mockStateConfigGet).toHaveBeenCalledWith(
      '/state-config/states/NC',
      { headers: { authorization: 'Bearer fallback-token' } },
    );
    expect(result).toMatchObject({
      active: true,
      planName: 'NC Medicaid Standard',
      raw: {
        simulated: true,
        source: '270-271-simulator',
        payer_id: 'NCXIX',
      },
    });
  });
});
