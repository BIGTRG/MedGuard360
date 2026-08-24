import type { NctracksAdapter, RemittanceFile } from '@medguard360/nctracks';
import { createNctracksAdapter } from '@medguard360/nctracks';
import { pollNctracksRemittances } from './nctracks';
import * as repo from './nctracks-repository';

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(),
}));

jest.mock('@medguard360/shared', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
  nctracksBatchFilesIn: { inc: jest.fn() },
  nctracksBatchFilesOut: { inc: jest.fn() },
  nctracksAck999RejectTotal: { inc: jest.fn() },
  observeNctracksRealtime: jest.fn(),
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

const mockedCreateNctracksAdapter = jest.mocked(createNctracksAdapter);
const mockedRepo = jest.mocked(repo);

function buildAdapter(remittances: RemittanceFile[]): NctracksAdapter {
  return {
    mode: 'sftp',
    checkEligibility: jest.fn() as jest.MockedFunction<NctracksAdapter['checkEligibility']>,
    submitClaim: jest.fn() as jest.MockedFunction<NctracksAdapter['submitClaim']>,
    getClaimStatus: jest.fn() as jest.MockedFunction<NctracksAdapter['getClaimStatus']>,
    retrieveRemittances: jest.fn().mockResolvedValue(remittances) as jest.MockedFunction<
      NctracksAdapter['retrieveRemittances']
    >,
    pollAcks: jest.fn() as jest.MockedFunction<NctracksAdapter['pollAcks']>,
    healthCheck: jest.fn() as jest.MockedFunction<NctracksAdapter['healthCheck']>,
  };
}

function buildRemittanceFile(claims: RemittanceFile['claims']): RemittanceFile {
  return {
    fileName: 'RA-20260615.835',
    receivedAt: '2026-06-15T12:00:00.000Z',
    checkOrEftNumber: 'CHK-123',
    paymentDate: '2026-06-15',
    payeeNpi: '1234567890',
    totalPaid: claims.reduce((sum, claim) => sum + claim.paidAmount, 0),
    claims,
    raw835: 'ST*835*0001~',
  };
}

function buildRemittanceClaim(
  patientControlNumber: string,
  claimStatusCode: string,
  paidAmount: number,
): RemittanceFile['claims'][number] {
  return {
    patientControlNumber,
    payerClaimControlNumber: `TCN-${patientControlNumber}`,
    chargedAmount: 200,
    paidAmount,
    claimStatusCode,
    adjustments: [],
    remarks: [],
    serviceLines: [],
  };
}

describe('pollNctracksRemittances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRepo.getLastRemittanceWatermark.mockResolvedValue('2026-06-01T00:00:00.000Z');
    mockedRepo.remittanceFileExists.mockResolvedValue(false);
    mockedRepo.insertRemittanceFile.mockResolvedValue('remit-file-1');
    mockedRepo.insertRemittanceClaim.mockResolvedValue('remit-claim-1');
    mockedRepo.findClaimIdByControlNumber.mockResolvedValue('claim-1');
    mockedRepo.applyRemittanceToClaim.mockResolvedValue(undefined);
    mockedRepo.insertX12Audit.mockResolvedValue(undefined);
  });

  it('applies only payable remittance rows and leaves denied rows untouched', async () => {
    const file = buildRemittanceFile([
      buildRemittanceClaim('PCN-PAID', '1', 175.5),
      buildRemittanceClaim('PCN-DENIED', '4', 0),
    ]);
    const adapter = buildAdapter([file]);
    mockedCreateNctracksAdapter.mockReturnValue(adapter);
    mockedRepo.insertRemittanceClaim
      .mockResolvedValueOnce('remit-claim-paid')
      .mockResolvedValueOnce('remit-claim-denied');

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 1, applied: 1 });
    expect(adapter.retrieveRemittances).toHaveBeenCalledWith({ since: '2026-06-01T00:00:00.000Z' });
    expect(mockedRepo.insertX12Audit).toHaveBeenCalledWith(expect.objectContaining({
      direction: 'inbound',
      transactionType: '835',
      fileName: 'RA-20260615.835',
      payload: 'ST*835*0001~',
      adapterMode: 'sftp',
    }));
    expect(mockedRepo.insertRemittanceClaim).toHaveBeenCalledTimes(2);
    expect(mockedRepo.findClaimIdByControlNumber).toHaveBeenCalledTimes(1);
    expect(mockedRepo.findClaimIdByControlNumber).toHaveBeenCalledWith('PCN-PAID');
    expect(mockedRepo.applyRemittanceToClaim).toHaveBeenCalledWith(
      'remit-claim-paid',
      'claim-1',
      17550,
      'TCN-PCN-PAID',
    );
  });

  it('skips duplicate remittance files before auditing or applying claims', async () => {
    const file = buildRemittanceFile([buildRemittanceClaim('PCN-PAID', '1', 175.5)]);
    mockedCreateNctracksAdapter.mockReturnValue(buildAdapter([file]));
    mockedRepo.remittanceFileExists.mockResolvedValue(true);

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 1, applied: 0 });
    expect(mockedRepo.insertRemittanceFile).not.toHaveBeenCalled();
    expect(mockedRepo.insertX12Audit).not.toHaveBeenCalled();
    expect(mockedRepo.insertRemittanceClaim).not.toHaveBeenCalled();
    expect(mockedRepo.applyRemittanceToClaim).not.toHaveBeenCalled();
  });

  it('persists payable rows without applying when no matching claim exists', async () => {
    const file = buildRemittanceFile([buildRemittanceClaim('PCN-MISSING', '1', 50)]);
    mockedCreateNctracksAdapter.mockReturnValue(buildAdapter([file]));
    mockedRepo.findClaimIdByControlNumber.mockResolvedValue(null);

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 1, applied: 0 });
    expect(mockedRepo.insertRemittanceClaim).toHaveBeenCalledWith(expect.objectContaining({
      patientControlNumber: 'PCN-MISSING',
      claimStatusCode: '1',
    }));
    expect(mockedRepo.applyRemittanceToClaim).not.toHaveBeenCalled();
  });
});
