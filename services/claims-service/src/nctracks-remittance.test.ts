import { createNctracksAdapter, type NctracksAdapter, type RemittanceFile } from '@medguard360/nctracks';
import { pollNctracksRemittances } from './nctracks';
import * as repo from './nctracks-repository';

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(),
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

const mockedRepo = jest.mocked(repo);
const mockedCreateNctracksAdapter = jest.mocked(createNctracksAdapter);

function buildAdapter(remittances: RemittanceFile[], mode: NctracksAdapter['mode'] = 'sftp'): NctracksAdapter {
  const retrieveRemittances: jest.MockedFunction<NctracksAdapter['retrieveRemittances']> = jest.fn(
    async () => remittances,
  );

  return {
    mode,
    checkEligibility: async () => {
      throw new Error('checkEligibility is not used by these tests');
    },
    submitClaim: async () => {
      throw new Error('submitClaim is not used by these tests');
    },
    getClaimStatus: async () => {
      throw new Error('getClaimStatus is not used by these tests');
    },
    retrieveRemittances,
    pollAcks: async () => ({ ack999: [], ack277CA: [] }),
    healthCheck: async () => ({ realtimeOk: true, sftpOk: true }),
  };
}

const remittanceFile: RemittanceFile = {
  fileName: '835_20260806.edi',
  receivedAt: '2026-08-06T10:00:00.000Z',
  checkOrEftNumber: 'EFT-20260806',
  paymentDate: '2026-08-05',
  payeeNpi: '1234567890',
  totalPaid: 125.5,
  raw835: 'ISA*00*835~',
  claims: [
    {
      patientControlNumber: 'CCN-PAID-001',
      payerClaimControlNumber: 'TCN-PAID-001',
      chargedAmount: 150,
      paidAmount: 125.5,
      claimStatusCode: '1',
      adjustments: [],
      remarks: [],
      serviceLines: [],
    },
    {
      patientControlNumber: 'CCN-DENIED-001',
      payerClaimControlNumber: 'TCN-DENIED-001',
      chargedAmount: 75,
      paidAmount: 0,
      claimStatusCode: '4',
      adjustments: [],
      remarks: [],
      serviceLines: [],
    },
  ],
};

describe('pollNctracksRemittances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('audits new 835 files and applies only payable remittance rows to claims', async () => {
    const adapter = buildAdapter([remittanceFile]);
    mockedCreateNctracksAdapter.mockReturnValue(adapter);
    mockedRepo.getLastRemittanceWatermark.mockResolvedValue('2026-08-01T00:00:00.000Z');
    mockedRepo.remittanceFileExists.mockResolvedValue(false);
    mockedRepo.insertRemittanceFile.mockResolvedValue('remittance-file-id');
    mockedRepo.insertX12Audit.mockResolvedValue(undefined);
    mockedRepo.insertRemittanceClaim
      .mockResolvedValueOnce('remittance-claim-paid')
      .mockResolvedValueOnce('remittance-claim-denied');
    mockedRepo.findClaimIdByControlNumber.mockResolvedValue('claim-paid-id');
    mockedRepo.applyRemittanceToClaim.mockResolvedValue(undefined);

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 1, applied: 1 });
    expect(adapter.retrieveRemittances).toHaveBeenCalledWith({ since: '2026-08-01T00:00:00.000Z' });
    expect(mockedRepo.insertRemittanceFile).toHaveBeenCalledWith({
      fileName: remittanceFile.fileName,
      checkOrEftNumber: remittanceFile.checkOrEftNumber,
      paymentDate: remittanceFile.paymentDate,
      payeeNpi: remittanceFile.payeeNpi,
      totalPaid: remittanceFile.totalPaid,
      raw835: remittanceFile.raw835,
      adapterMode: 'sftp',
      receivedAt: remittanceFile.receivedAt,
    });
    expect(mockedRepo.insertX12Audit).toHaveBeenCalledWith({
      direction: 'inbound',
      transactionType: '835',
      fileName: remittanceFile.fileName,
      payload: remittanceFile.raw835,
      adapterMode: 'sftp',
    });
    expect(mockedRepo.insertRemittanceClaim).toHaveBeenCalledTimes(2);
    expect(mockedRepo.findClaimIdByControlNumber).toHaveBeenCalledTimes(1);
    expect(mockedRepo.findClaimIdByControlNumber).toHaveBeenCalledWith('CCN-PAID-001');
    expect(mockedRepo.applyRemittanceToClaim).toHaveBeenCalledWith(
      'remittance-claim-paid',
      'claim-paid-id',
      12550,
      'TCN-PAID-001',
    );
  });

  it('skips duplicate 835 files without reapplying remittance rows', async () => {
    mockedCreateNctracksAdapter.mockReturnValue(buildAdapter([remittanceFile]));
    mockedRepo.getLastRemittanceWatermark.mockResolvedValue(undefined);
    mockedRepo.remittanceFileExists.mockResolvedValue(true);

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 1, applied: 0 });
    expect(mockedRepo.insertRemittanceFile).not.toHaveBeenCalled();
    expect(mockedRepo.insertRemittanceClaim).not.toHaveBeenCalled();
    expect(mockedRepo.applyRemittanceToClaim).not.toHaveBeenCalled();
  });
});
