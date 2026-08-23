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

const queryMock = pool.query as jest.MockedFunction<typeof pool.query>;
const warnMock = logger.warn as jest.MockedFunction<typeof logger.warn>;

const successfulInsert: Awaited<ReturnType<typeof pool.query>> = {
  rows: [],
  command: 'INSERT',
  rowCount: 1,
  oid: 0,
  fields: [],
};

describe('recordEligibilityX12Audit', () => {
  beforeEach(() => {
    queryMock.mockReset();
    warnMock.mockReset();
  });

  it('records inbound 271 payloads against the subscriber control number', async () => {
    queryMock.mockResolvedValue(successfulInsert);

    await recordEligibilityX12Audit({
      subscriberId: 'NCMD00100001',
      traceId: 'TRACE-001',
      adapterMode: 'stub',
      raw271: 'ISA*00*          *00*          *ZZ*NCTRACKS~',
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("VALUES ('inbound', '271', $1, $2, $3)"),
      ['NCMD00100001', 'ISA*00*          *00*          *ZZ*NCTRACKS~', 'stub'],
    );
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('does not fail eligibility lookup when audit persistence fails', async () => {
    queryMock.mockRejectedValue(new Error('relation "nctracks_x12_audit" does not exist'));

    await expect(recordEligibilityX12Audit({
      subscriberId: 'NCMD00100002',
      traceId: 'TRACE-002',
      adapterMode: 'soap',
      raw271: 'EB*1*IND*30*MC*NC Medicaid~',
    })).resolves.toBeUndefined();

    expect(warnMock).toHaveBeenCalledWith('nctracks eligibility audit failed (non-fatal)', {
      traceId: 'TRACE-002',
      error: 'relation "nctracks_x12_audit" does not exist',
    });
  });
});
