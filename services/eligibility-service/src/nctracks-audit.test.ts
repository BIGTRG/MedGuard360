const mockQuery = jest.fn<Promise<unknown>, [string, unknown[]]>();
const mockWarn = jest.fn<void, [string, Record<string, unknown>]>();

jest.mock('@medguard360/shared', () => ({
  pool: {
    query: mockQuery,
  },
  logger: {
    warn: mockWarn,
  },
}), { virtual: true });

import { recordEligibilityX12Audit } from './nctracks-audit';

describe('recordEligibilityX12Audit', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockWarn.mockReset();
  });

  it('records inbound 271 eligibility responses with subscriber audit keys', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await recordEligibilityX12Audit({
      subscriberId: 'NCMD00100001',
      traceId: 'TRACE-271-001',
      adapterMode: 'stub',
      raw271: 'ISA*00*~ST*271*0001~',
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO nctracks_x12_audit'),
      ['NCMD00100001', 'ISA*00*~ST*271*0001~', 'stub'],
    );
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('logs and suppresses audit persistence failures so eligibility remains available', async () => {
    mockQuery.mockRejectedValue(new Error('database unavailable'));

    await expect(recordEligibilityX12Audit({
      subscriberId: 'NCMD00100009',
      traceId: 'TRACE-271-ERR',
      adapterMode: 'soap',
      raw271: 'AAA*N**42*C~',
    })).resolves.toBeUndefined();

    expect(mockWarn).toHaveBeenCalledWith('nctracks eligibility audit failed (non-fatal)', {
      traceId: 'TRACE-271-ERR',
      error: 'database unavailable',
    });
  });
});
