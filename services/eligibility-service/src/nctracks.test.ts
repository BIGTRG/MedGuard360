import { lookupNctracks, shouldUseNctracks } from './nctracks';
import { recordEligibilityX12Audit } from './nctracks-audit';

jest.mock('./nctracks-audit', () => ({
  recordEligibilityX12Audit: jest.fn(),
}));

const auditMock = recordEligibilityX12Audit as jest.MockedFunction<typeof recordEligibilityX12Audit>;

beforeEach(() => {
  jest.clearAllMocks();
  auditMock.mockResolvedValue(undefined);
});

describe('shouldUseNctracks', () => {
  it('routes NC to NCTracks by default', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC')).toBe(false);
    delete process.env.NCTRACKS_MODE;
  });
});

describe('lookupNctracks', () => {
  it('returns active coverage for standard Medicaid IDs', async () => {
    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100001',
      patientFirstName: 'Jane',
      patientLastName: 'Doe',
    });
    expect(result.active).toBe(true);
    expect(result.source).toBe('nctracks_270_271');
    expect(result.raw.source).toBe('nctracks');
    expect(result.raw.mode).toBe('stub');
  });

  it('records an inbound 271 audit entry for the eligibility response', async () => {
    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100001',
      patientFirstName: 'Jane',
      patientLastName: 'Doe',
    });

    expect(auditMock).toHaveBeenCalledTimes(1);
    expect(auditMock).toHaveBeenCalledWith({
      subscriberId: 'NCMD00100001',
      traceId: result.raw.traceId,
      adapterMode: 'stub',
      raw271: result.raw.raw271,
    });
  });

  it('returns inactive for IDs ending in 9', async () => {
    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100009',
    });
    expect(result.active).toBe(false);
  });
});