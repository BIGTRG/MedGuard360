import type { NctracksAdapter, NctracksMode, RemittanceFile } from '@medguard360/nctracks';
import { createNctracksAdapter } from '@medguard360/nctracks';
import { nctracksBatchFilesIn } from '@medguard360/shared';
import { pollNctracksRemittances } from './nctracks';
import * as repo from './nctracks-repository';

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(),
}));

jest.mock('@medguard360/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
  nctracksBatchFilesIn: { inc: jest.fn() },
  nctracksBatchFilesOut: { inc: jest.fn() },
  nctracksAck999RejectTotal: { inc: jest.fn() },
  observeNctracksRealtime: jest.fn(async <T>(_kind: string, fn: () => Promise<T>) => fn()),
}));

jest.mock('./nctracks-repository', () => ({
  getLastRemittanceWatermark: jest.fn(),
  remittanceFileExists: jest.fn(),
  insertRemittanceFile: jest.fn(),
  insertX12Audit: jest.fn(),
  insertRemittanceClaim: jest.fn(),
  findClaimIdByControlNumber: jest.fn(),
  applyRemittanceToClaim: jest.fn(),
}));

const createNctracksAdapterMock = jest.mocked(createNctracksAdapter);
const repoMock = jest.mocked(repo);
const batchFilesInMock = jest.mocked(nctracksBatchFilesIn);

function makeAdapter(files: RemittanceFile[], mode: NctracksMode = 'sftp'): NctracksAdapter {
  return {
    mode,
    checkEligibility: jest.fn(),
    submitClaim: jest.fn(),
    getClaimStatus: jest.fn(),
    retrieveRemittances: jest.fn().mockResolvedValue(files),
    pollAcks: jest.fn(),
    healthCheck: jest.fn(),
  };
}

function makeRemittanceClaim(
  overrides: Partial<RemittanceFile['claims'][number]> = {},
): RemittanceFile['claims'][number] {
  return {
    patientControlNumber: 'PCN-PAID',
    payerClaimControlNumber: 'TCN-PAID',
    chargedAmount: 100,
    paidAmount: 80.12,
    claimStatusCode: '1',
    adjustments: [],
    remarks: [],
    serviceLines: [],
    ...overrides,
  };
}

function makeRemittanceFile(overrides: Partial<RemittanceFile> = {}): RemittanceFile {
  return {
    fileName: 'RA_20260731.835',
    receivedAt: '2026-07-31T10:00:00.000Z',
    checkOrEftNumber: 'CHK-20260731',
    paymentDate: '2026-07-31',
    payeeNpi: '1234567890',
    totalPaid: 120.12,
    raw835: 'ST*835*0001~CLP*PCN-PAID*1*100*80.12**MC*TCN-PAID~',
    claims: [makeRemittanceClaim()],
    ...overrides,
  };
}

describe('pollNctracksRemittances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repoMock.getLastRemittanceWatermark.mockResolvedValue(undefined);
    repoMock.remittanceFileExists.mockResolvedValue(false);
    repoMock.insertRemittanceFile.mockResolvedValue('remit-file-1');
    repoMock.insertX12Audit.mockResolvedValue();
    repoMock.insertRemittanceClaim.mockImplementation(async (entry) => `remit-claim-${entry.patientControlNumber}`);
    repoMock.findClaimIdByControlNumber.mockImplementation(async (patientControlNumber) => (
      patientControlNumber === 'PCN-PAID' ? 'claim-paid' : null
    ));
    repoMock.applyRemittanceToClaim.mockResolvedValue();
  });

  it('applies payable remittance rows to matched claims in cents', async () => {
    const file = makeRemittanceFile({
      claims: [
        makeRemittanceClaim(),
        makeRemittanceClaim({
          patientControlNumber: 'PCN-DENIED',
          payerClaimControlNumber: 'TCN-DENIED',
          paidAmount: 0,
          claimStatusCode: '4',
        }),
        makeRemittanceClaim({
          patientControlNumber: 'PCN-UNKNOWN',
          payerClaimControlNumber: 'TCN-UNKNOWN',
          paidAmount: 40,
          claimStatusCode: '2',
        }),
      ],
    });
    createNctracksAdapterMock.mockReturnValue(makeAdapter([file]));

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 1, applied: 1 });
    expect(batchFilesInMock.inc).toHaveBeenCalledWith({ type: '835' }, 1);
    expect(repoMock.insertRemittanceFile).toHaveBeenCalledWith({
      fileName: file.fileName,
      checkOrEftNumber: file.checkOrEftNumber,
      paymentDate: file.paymentDate,
      payeeNpi: file.payeeNpi,
      totalPaid: file.totalPaid,
      raw835: file.raw835,
      adapterMode: 'sftp',
      receivedAt: file.receivedAt,
    });
    expect(repoMock.insertX12Audit).toHaveBeenCalledWith({
      direction: 'inbound',
      transactionType: '835',
      fileName: file.fileName,
      payload: file.raw835,
      adapterMode: 'sftp',
    });
    expect(repoMock.insertRemittanceClaim).toHaveBeenCalledTimes(3);
    expect(repoMock.findClaimIdByControlNumber).toHaveBeenCalledTimes(2);
    expect(repoMock.findClaimIdByControlNumber).not.toHaveBeenCalledWith('PCN-DENIED');
    expect(repoMock.applyRemittanceToClaim).toHaveBeenCalledTimes(1);
    expect(repoMock.applyRemittanceToClaim).toHaveBeenCalledWith(
      'remit-claim-PCN-PAID',
      'claim-paid',
      8012,
      'TCN-PAID',
    );
  });

  it('uses the remittance watermark and skips duplicate files without applying claims', async () => {
    const watermark = '2026-07-30T12:00:00.000Z';
    const adapter = makeAdapter([makeRemittanceFile()]);
    repoMock.getLastRemittanceWatermark.mockResolvedValue(watermark);
    repoMock.remittanceFileExists.mockResolvedValue(true);
    createNctracksAdapterMock.mockReturnValue(adapter);

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 1, applied: 0 });
    expect(adapter.retrieveRemittances).toHaveBeenCalledWith({ since: watermark });
    expect(repoMock.insertRemittanceFile).not.toHaveBeenCalled();
    expect(repoMock.insertRemittanceClaim).not.toHaveBeenCalled();
    expect(repoMock.applyRemittanceToClaim).not.toHaveBeenCalled();
  });

  it('does not attempt 835 retrieval for SOAP-only mode', async () => {
    const adapter = makeAdapter([], 'soap');
    createNctracksAdapterMock.mockReturnValue(adapter);

    await expect(pollNctracksRemittances()).resolves.toEqual({ files: 0, applied: 0 });

    expect(repoMock.getLastRemittanceWatermark).not.toHaveBeenCalled();
    expect(adapter.retrieveRemittances).not.toHaveBeenCalled();
  });
});
