import {
  shouldUseNctracks,
  submitNcClaim,
  indexAck277ByPcn,
  nctracksPollIntervalMs,
  dollarsToCents,
  isRemittancePayable,
  getNctracksIntegrationStatus,
  pollNctracksRemittances,
} from './nctracks';
import {
  createNctracksAdapter,
  type Ack277CA,
  type NctracksAdapter,
  type NctracksMode,
  type RemittanceFile,
  type RemittanceQuery,
} from '@medguard360/nctracks';
import * as repo from './nctracks-repository';

jest.mock('@medguard360/nctracks', () => {
  const actual = jest.requireActual<typeof import('@medguard360/nctracks')>('@medguard360/nctracks');
  return {
    ...actual,
    createNctracksAdapter: jest.fn(actual.createNctracksAdapter),
  };
});

jest.mock('./nctracks-repository', () => ({
  getLastRemittanceWatermark: jest.fn(),
  remittanceFileExists: jest.fn(),
  insertRemittanceFile: jest.fn(),
  insertX12Audit: jest.fn(),
  insertRemittanceClaim: jest.fn(),
  findClaimIdByControlNumber: jest.fn(),
  applyRemittanceToClaim: jest.fn(),
  getNctracksIntegrationStats: jest.fn(),
}));

const actualNctracks = jest.requireActual<typeof import('@medguard360/nctracks')>('@medguard360/nctracks');
const mockedCreateNctracksAdapter = jest.mocked(createNctracksAdapter);
const mockedRepo = jest.mocked(repo);

function makeRemittanceFile(overrides: Partial<RemittanceFile> = {}): RemittanceFile {
  return {
    fileName: 'RA_20260822.835',
    receivedAt: '2026-08-22T10:00:00.000Z',
    checkOrEftNumber: 'CHK-20260822',
    paymentDate: '2026-08-22',
    payeeNpi: '1234567890',
    totalPaid: 123.45,
    claims: [],
    raw835: 'ISA*00*REMITS~',
    ...overrides,
  };
}

function makeAdapter(mode: NctracksMode, files: RemittanceFile[] = []): NctracksAdapter {
  const unsupported = async (): Promise<never> => {
    throw new Error('not used by this test');
  };

  return {
    mode,
    checkEligibility: unsupported,
    submitClaim: unsupported,
    getClaimStatus: unsupported,
    retrieveRemittances: jest.fn<Promise<RemittanceFile[]>, [RemittanceQuery?]>().mockResolvedValue(files),
    pollAcks: async () => ({ ack999: [], ack277CA: [] }),
    healthCheck: async () => ({ realtimeOk: true, sftpOk: true }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedCreateNctracksAdapter.mockImplementation(actualNctracks.createNctracksAdapter);
  mockedRepo.getNctracksIntegrationStats.mockResolvedValue({
    submissions: 0,
    pendingAcks: 0,
    remittanceFiles: 0,
    x12AuditRows: 0,
  });
});

describe('shouldUseNctracks', () => {
  it('routes NC claims through NCTracks', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('returns false when mode is disabled', () => {
    const prev = process.env.NCTRACKS_MODE;
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC')).toBe(false);
    if (prev === undefined) delete process.env.NCTRACKS_MODE;
    else process.env.NCTRACKS_MODE = prev;
  });
});

describe('indexAck277ByPcn', () => {
  it('indexes per-claim STC rows by patient control number', () => {
    const acks: Ack277CA[] = [{
      status: 'accepted',
      perClaim: [{ patientControlNumber: 'PCN-1', status: 'accepted', categoryCode: 'A0', statusCode: '20' }],
      raw: 'stub',
    }];
    const map = indexAck277ByPcn(acks);
    expect(map.get('PCN-1')?.status).toBe('accepted');
  });
});

describe('nctracksPollIntervalMs', () => {
  it('defaults to zero when unset', () => {
    const prev = process.env.NCTRACKS_POLL_INTERVAL_MS;
    delete process.env.NCTRACKS_POLL_INTERVAL_MS;
    expect(nctracksPollIntervalMs()).toBe(0);
    if (prev === undefined) delete process.env.NCTRACKS_POLL_INTERVAL_MS;
    else process.env.NCTRACKS_POLL_INTERVAL_MS = prev;
  });
});

describe('remittance helpers', () => {
  it('converts dollars to cents', () => {
    expect(dollarsToCents(175.5)).toBe(17550);
  });

  it('detects payable CLP02 codes', () => {
    expect(isRemittancePayable('1')).toBe(true);
    expect(isRemittancePayable('4')).toBe(false);
  });
});

describe('pollNctracksRemittances', () => {
  it('skips duplicate files and only applies payable matched claims', async () => {
    const watermark = new Date('2026-08-21T09:30:00.000Z');
    const duplicate = makeRemittanceFile({ fileName: 'RA_DUPLICATE.835' });
    const incoming = makeRemittanceFile({
      fileName: 'RA_NEW.835',
      claims: [
        {
          patientControlNumber: 'PCN-PAID',
          payerClaimControlNumber: 'TCN-PAID',
          chargedAmount: 125,
          paidAmount: 123.45,
          claimStatusCode: '1',
          adjustments: [],
          remarks: [],
          serviceLines: [],
        },
        {
          patientControlNumber: 'PCN-DENIED',
          payerClaimControlNumber: 'TCN-DENIED',
          chargedAmount: 80,
          paidAmount: 0,
          claimStatusCode: '4',
          adjustments: [],
          remarks: [],
          serviceLines: [],
        },
        {
          patientControlNumber: 'PCN-UNMATCHED',
          payerClaimControlNumber: 'TCN-UNMATCHED',
          chargedAmount: 50,
          paidAmount: 25,
          claimStatusCode: '2',
          adjustments: [],
          remarks: [],
          serviceLines: [],
        },
      ],
    });
    const adapter = makeAdapter('sftp', [duplicate, incoming]);
    mockedCreateNctracksAdapter.mockReturnValue(adapter);
    mockedRepo.getLastRemittanceWatermark.mockResolvedValue(watermark.toISOString());
    mockedRepo.remittanceFileExists.mockImplementation(async (fileName) => fileName === duplicate.fileName);
    mockedRepo.insertRemittanceFile.mockResolvedValue('remit-file-id');
    mockedRepo.insertRemittanceClaim.mockImplementation(async (entry) => `row-${entry.patientControlNumber}`);
    mockedRepo.findClaimIdByControlNumber.mockImplementation(async (pcn) => (
      pcn === 'PCN-PAID' ? 'claim-id-paid' : null
    ));

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 2, applied: 1 });
    expect(adapter.retrieveRemittances).toHaveBeenCalledWith({ since: watermark.toISOString() });
    expect(mockedRepo.insertRemittanceFile).toHaveBeenCalledTimes(1);
    expect(mockedRepo.insertRemittanceFile).toHaveBeenCalledWith(expect.objectContaining({
      fileName: incoming.fileName,
      raw835: incoming.raw835,
      adapterMode: 'sftp',
    }));
    expect(mockedRepo.insertX12Audit).toHaveBeenCalledTimes(1);
    expect(mockedRepo.insertRemittanceClaim).toHaveBeenCalledTimes(3);
    expect(mockedRepo.findClaimIdByControlNumber).toHaveBeenCalledTimes(2);
    expect(mockedRepo.findClaimIdByControlNumber).toHaveBeenCalledWith('PCN-PAID');
    expect(mockedRepo.findClaimIdByControlNumber).toHaveBeenCalledWith('PCN-UNMATCHED');
    expect(mockedRepo.findClaimIdByControlNumber).not.toHaveBeenCalledWith('PCN-DENIED');
    expect(mockedRepo.applyRemittanceToClaim).toHaveBeenCalledTimes(1);
    expect(mockedRepo.applyRemittanceToClaim).toHaveBeenCalledWith(
      'row-PCN-PAID',
      'claim-id-paid',
      12345,
      'TCN-PAID',
    );
  });

  it('does not retrieve 835 remittances in soap-only mode', async () => {
    const adapter = makeAdapter('soap');
    mockedCreateNctracksAdapter.mockReturnValue(adapter);

    await expect(pollNctracksRemittances()).resolves.toEqual({ files: 0, applied: 0 });

    expect(adapter.retrieveRemittances).not.toHaveBeenCalled();
    expect(mockedRepo.getLastRemittanceWatermark).not.toHaveBeenCalled();
  });
});

describe('submitNcClaim', () => {
  const prevMode = process.env.NCTRACKS_MODE;

  beforeEach(() => {
    process.env.NCTRACKS_MODE = 'stub';
  });

  afterAll(() => {
    if (prevMode === undefined) delete process.env.NCTRACKS_MODE;
    else process.env.NCTRACKS_MODE = prevMode;
  });

  it('returns stub submission metadata for NC professional claims', async () => {
    const result = await submitNcClaim({
      ccn: 'CCN-TEST-001',
      totalCharge: 125.5,
      patientMedicaidId: 'NCMD00100001',
      serviceDate: '20260706',
      billingNpi: '1234567890',
      diagnosisCodes: ['Z00.00'],
      lines: [{
        procedure_code: '99213',
        modifier_codes: [],
        units: 1,
        charge_amount: 125.5,
        service_date: '20260706',
        place_of_service: '11',
        diagnosis_pointers: [1],
      }],
    });
    expect(result.fileName).toMatch(/^mg360_P_/);
    expect(result.interchangeControlNumber).toBeTruthy();
    expect(result.ack999?.accepted).toBe(true);
    expect(result.adapterMode).toBe('stub');
  });
});

describe('getNctracksIntegrationStatus', () => {
  const prevMode = process.env.NCTRACKS_MODE;

  beforeEach(() => {
    process.env.NCTRACKS_MODE = 'stub';
  });

  afterAll(() => {
    if (prevMode === undefined) delete process.env.NCTRACKS_MODE;
    else process.env.NCTRACKS_MODE = prevMode;
  });

  it('returns adapter mode and transport health', async () => {
    const status = await getNctracksIntegrationStatus();
    expect(status.mode).toBe('stub');
    expect(status.health.realtimeOk).toBe(true);
    expect(status.health.sftpOk).toBe(true);
    expect(status.retentionYears).toBeGreaterThan(0);
  });
});