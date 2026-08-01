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

const queryMock = jest.mocked(pool.query);
const warnMock = jest.mocked(logger.warn);

describe('recordEligibilityX12Audit', () => {
  beforeEach(() => {
    queryMock.mockReset();
    warnMock.mockReset();
  });

  it('persists inbound 271 payloads with subscriber and adapter context', async () => {
    queryMock.mockResolvedValue({
      rows: [],
      rowCount: 1,
      command: 'INSERT',
      oid: 0,
      fields: [],
    });

    await recordEligibilityX12Audit({
      subscriberId: 'NCMD00100001',
      traceId: 'MG360-NC-123',
      adapterMode: 'stub',
      raw271: 'ISA*00*~ST*271*0001~EB*1~',
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO nctracks_x12_audit'),
      ['NCMD00100001', 'ISA*00*~ST*271*0001~EB*1~', 'stub'],
    );
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('logs audit persistence failures without blocking eligibility lookup', async () => {
    queryMock.mockRejectedValue(new Error('database unavailable'));

    await expect(recordEligibilityX12Audit({
      subscriberId: 'NCMD00100002',
      traceId: 'MG360-NC-456',
      adapterMode: 'soap',
      raw271: 'ST*271*0002~AAA*N**75*C~',
    })).resolves.toBeUndefined();

    expect(warnMock).toHaveBeenCalledWith(
      'nctracks eligibility audit failed (non-fatal)',
      {
        traceId: 'MG360-NC-456',
        error: 'database unavailable',
      },
    );
  });
});
