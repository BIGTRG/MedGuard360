import { createNctracksAdapter, type NctracksAdapter, type NctracksMode, type RemittanceFile } from '@medguard360/nctracks';
import * as repo from './nctracks-repository';
import { pollNctracksRemittances } from './nctracks';

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

const mockedCreateNctracksAdapter = jest.mocked(createNctracksAdapter);
const mockedRepo = jest.mocked(repo);

function makeAdapter(mode: NctracksMode = 'sftp'): jest.Mocked<NctracksAdapter> {
  return {
    mode,
    checkEligibility: jest.fn<ReturnType<NctracksAdapter['checkEligibility']>, Parameters<NctracksAdapter['checkEligibility']>>(),
    submitClaim: jest.fn<ReturnType<NctracksAdapter['submitClaim']>, Parameters<NctracksAdapter['submitClaim']>>(),
    getClaimStatus: jest.fn<ReturnType<NctracksAdapter['getClaimStatus']>, Parameters<NctracksAdapter['getClaimStatus']>>(),
    retrieveRemittances: jest.fn<ReturnType<NctracksAdapter['retrieveRemittances']>, Parameters<NctracksAdapter['retrieveRemittances']>>(),
    pollAcks: jest.fn<ReturnType<NctracksAdapter['pollAcks']>, Parameters<NctracksAdapter['pollAcks']>>(),
    healthCheck: jest.fn<ReturnType<NctracksAdapter['healthCheck']>, Parameters<NctracksAdapter['healthCheck']>>(),
  };
}

function makeRemittanceFile(overrides: Partial<RemittanceFile> = {}): RemittanceFile {
  return {
    fileName: 'RA_20260801.835',
    receivedAt: '2026-08-01T10:00:00.000Z',
    checkOrEftNumber: 'CHK-20260801',
    paymentDate: '2026-08-01',
    payeeNpi: '1234567890',
    totalPaid: 120.25,
    raw835: 'ISA*00*          *00*          *ZZ*NCTRACKS       *ZZ*MEDGUARD360    *260801*1000*^*00501*000000001*0*T*:~',
    claims: [{
      patientControlNumber: 'PCN-PAID',
      payerClaimControlNumber: 'TCN-PAID',
      chargedAmount: 150,
      paidAmount: 80.25,
      claimStatusCode: '1',
      adjustments: [],
      remarks: [],
      serviceLines: [],
    }],
    ...overrides,
  };
}

describe('pollNctracksRemittances', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('persists inbound 835 files and applies only payable claim rows', async () => {
    const adapter = makeAdapter();
    const remittanceFile = makeRemittanceFile({
      claims: [
        {
          patientControlNumber: 'PCN-PAID',
          payerClaimControlNumber: 'TCN-PAID',
          chargedAmount: 150,
          paidAmount: 80.25,
          claimStatusCode: '1',
          adjustments: [],
          remarks: [],
          serviceLines: [],
        },
        {
          patientControlNumber: 'PCN-DENIED',
          payerClaimControlNumber: 'TCN-DENIED',
          chargedAmount: 40,
          paidAmount: 0,
          claimStatusCode: '4',
          adjustments: [],
          remarks: [],
          serviceLines: [],
        },
      ],
    });
    mockedCreateNctracksAdapter.mockReturnValue(adapter);
    mockedRepo.getLastRemittanceWatermark.mockResolvedValue('2026-07-31T00:00:00.000Z');
    adapter.retrieveRemittances.mockResolvedValue([remittanceFile]);
    mockedRepo.remittanceFileExists.mockResolvedValue(false);
    mockedRepo.insertRemittanceFile.mockResolvedValue('remittance-file-id');
    mockedRepo.insertRemittanceClaim
      .mockResolvedValueOnce('remittance-claim-paid')
      .mockResolvedValueOnce('remittance-claim-denied');
    mockedRepo.findClaimIdByControlNumber.mockResolvedValue('claim-id');

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 1, applied: 1 });
    expect(adapter.retrieveRemittances).toHaveBeenCalledWith({ since: '2026-07-31T00:00:00.000Z' });
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
    expect(mockedRepo.findClaimIdByControlNumber).toHaveBeenCalledWith('PCN-PAID');
    expect(mockedRepo.applyRemittanceToClaim).toHaveBeenCalledWith(
      'remittance-claim-paid',
      'claim-id',
      8025,
      'TCN-PAID',
    );
  });

  it('skips duplicate remittance files without persisting claims again', async () => {
    const adapter = makeAdapter();
    mockedCreateNctracksAdapter.mockReturnValue(adapter);
    mockedRepo.getLastRemittanceWatermark.mockResolvedValue(undefined);
    adapter.retrieveRemittances.mockResolvedValue([makeRemittanceFile()]);
    mockedRepo.remittanceFileExists.mockResolvedValue(true);

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 1, applied: 0 });
    expect(adapter.retrieveRemittances).toHaveBeenCalledWith(undefined);
    expect(mockedRepo.insertRemittanceFile).not.toHaveBeenCalled();
    expect(mockedRepo.insertRemittanceClaim).not.toHaveBeenCalled();
    expect(mockedRepo.applyRemittanceToClaim).not.toHaveBeenCalled();
  });

  it('does not retrieve batch remittances when NCTracks is in SOAP-only mode', async () => {
    const adapter = makeAdapter('soap');
    mockedCreateNctracksAdapter.mockReturnValue(adapter);

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 0, applied: 0 });
    expect(mockedRepo.getLastRemittanceWatermark).not.toHaveBeenCalled();
    expect(adapter.retrieveRemittances).not.toHaveBeenCalled();
  });
});
