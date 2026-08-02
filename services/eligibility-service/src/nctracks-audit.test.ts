const mockQuery = jest.fn<Promise<{ rows: unknown[] }>, [string, unknown[]?]>();
const mockWarn = jest.fn<void, [string, Record<string, unknown>]>();

jest.mock('@medguard360/shared', () => ({
  pool: {
    query: mockQuery,
  },
  logger: {
    warn: mockWarn,
  },
}));

import { recordEligibilityX12Audit } from './nctracks-audit';

describe('recordEligibilityX12Audit', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockWarn.mockReset();
  });

  it('records inbound 271 X12 audit rows with subscriber, payload, and adapter mode', async () => {
    const raw271 = 'ST*271*0001~EB*1*IND*30**NC Medicaid Direct~SE*3*0001~';
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await recordEligibilityX12Audit({
      subscriberId: 'NCMD00100001',
      traceId: 'TRACE-271',
      adapterMode: 'soap',
      raw271,
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]?.[0]).toContain('nctracks_x12_audit');
    expect(mockQuery.mock.calls[0]?.[0]).toContain("'inbound', '271'");
    expect(mockQuery.mock.calls[0]?.[1]).toEqual(['NCMD00100001', raw271, 'soap']);
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('logs and does not throw when audit persistence fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('permission denied'));

    await expect(recordEligibilityX12Audit({
      subscriberId: 'NCMD00100009',
      traceId: 'TRACE-ERR',
      adapterMode: 'stub',
      raw271: 'AAA*N**41*C~',
    })).resolves.toBeUndefined();

    expect(mockWarn).toHaveBeenCalledWith('nctracks eligibility audit failed (non-fatal)', {
      traceId: 'TRACE-ERR',
      error: 'permission denied',
    });
  });
});
