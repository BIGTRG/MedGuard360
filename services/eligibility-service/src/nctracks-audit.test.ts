import { logger, pool } from '@medguard360/shared';
import { recordEligibilityX12Audit } from './nctracks-audit';

jest.mock('@medguard360/shared', () => ({
  pool: {
    query: jest.fn(),
  },
  logger: {
    warn: jest.fn(),
  },
}));

const poolQueryMock = pool.query as jest.MockedFunction<
  (queryText: string, values?: readonly unknown[]) => Promise<{ rows: unknown[] }>
>;
const loggerWarnMock = logger.warn as jest.MockedFunction<
  (message: string, meta?: Record<string, unknown>) => void
>;

describe('recordEligibilityX12Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists inbound 271 payloads with subscriber ID for reconciliation', async () => {
    poolQueryMock.mockResolvedValue({ rows: [] });

    await recordEligibilityX12Audit({
      subscriberId: 'NCMD00100007',
      traceId: 'TRACE-271',
      adapterMode: 'soap',
      raw271: 'ST*271*0001~',
    });

    expect(poolQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO nctracks_x12_audit'),
      ['NCMD00100007', 'ST*271*0001~', 'soap'],
    );
    expect(poolQueryMock.mock.calls[0][0]).toContain("VALUES ('inbound', '271', $1, $2, $3)");
  });

  it('logs audit failures without blocking eligibility responses', async () => {
    poolQueryMock.mockRejectedValue(new Error('audit table unavailable'));

    await expect(recordEligibilityX12Audit({
      subscriberId: 'NCMD00100999',
      traceId: 'TRACE-FAIL',
      adapterMode: 'stub',
      raw271: 'ST*271*0002~',
    })).resolves.toBeUndefined();

    expect(loggerWarnMock).toHaveBeenCalledWith(
      'nctracks eligibility audit failed (non-fatal)',
      {
        traceId: 'TRACE-FAIL',
        error: 'audit table unavailable',
      },
    );
  });
});
