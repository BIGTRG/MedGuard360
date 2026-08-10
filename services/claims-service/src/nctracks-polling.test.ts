import {
  createNctracksAdapter,
  type Ack277CA,
  type Ack999,
  type NctracksAdapter,
  type NctracksMode,
  type RemittanceFile,
} from '@medguard360/nctracks';
import * as repo from './nctracks-repository';
import type { NctracksSubmissionRow } from './nctracks-repository';
import { pollNctracksAcks, pollNctracksRemittances } from './nctracks';

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(),
}));

jest.mock('./nctracks-repository', () => ({
  listSubmissionsPendingAck: jest.fn(),
  updateSubmissionAcks: jest.fn(),
  insertX12Audit: jest.fn(),
  getLastRemittanceWatermark: jest.fn(),
  remittanceFileExists: jest.fn(),
  insertRemittanceFile: jest.fn(),
  insertRemittanceClaim: jest.fn(),
  findClaimIdByControlNumber: jest.fn(),
  applyRemittanceToClaim: jest.fn(),
}));

interface MockNctracksAdapter extends NctracksAdapter {
  checkEligibility: jest.MockedFunction<NctracksAdapter['checkEligibility']>;
  submitClaim: jest.MockedFunction<NctracksAdapter['submitClaim']>;
  getClaimStatus: jest.MockedFunction<NctracksAdapter['getClaimStatus']>;
  retrieveRemittances: jest.MockedFunction<NctracksAdapter['retrieveRemittances']>;
  pollAcks: jest.MockedFunction<NctracksAdapter['pollAcks']>;
  healthCheck: jest.MockedFunction<NctracksAdapter['healthCheck']>;
}

function createMockAdapter(mode: NctracksMode = 'sftp'): MockNctracksAdapter {
  return {
    mode,
    checkEligibility: jest.fn<ReturnType<NctracksAdapter['checkEligibility']>, Parameters<NctracksAdapter['checkEligibility']>>(),
    submitClaim: jest.fn<ReturnType<NctracksAdapter['submitClaim']>, Parameters<NctracksAdapter['submitClaim']>>(),
    getClaimStatus: jest.fn<ReturnType<NctracksAdapter['getClaimStatus']>, Parameters<NctracksAdapter['getClaimStatus']>>(),
    retrieveRemittances: jest.fn<
      ReturnType<NctracksAdapter['retrieveRemittances']>,
      Parameters<NctracksAdapter['retrieveRemittances']>
    >(),
    pollAcks: jest.fn<ReturnType<NctracksAdapter['pollAcks']>, Parameters<NctracksAdapter['pollAcks']>>(),
    healthCheck: jest.fn<ReturnType<NctracksAdapter['healthCheck']>, Parameters<NctracksAdapter['healthCheck']>>(),
  };
}

function pendingSubmission(overrides: Partial<NctracksSubmissionRow>): NctracksSubmissionRow {
  return {
    id: 'sub-default',
    claim_id: 'claim-default',
    patient_control_number: 'PCN-DEFAULT',
    interchange_control_number: '000000001',
    group_control_number: '1',
    transaction_set_control_number: '0001',
    file_name: 'claim.837',
    adapter_mode: 'sftp',
    submitted_at: new Date('2026-07-06T10:00:00.000Z'),
    ack999_accepted: null,
    ack999_raw: null,
    ack277ca_status: null,
    ack277ca_raw: null,
    ack_polled_at: null,
    payer_claim_control_number: null,
    ...overrides,
  };
}

const accepted999: Ack999 = {
  accepted: true,
  errors: [],
  raw: 'ISA*999~',
};

const accepted277: Ack277CA = {
  status: 'accepted',
  perClaim: [
    {
      patientControlNumber: 'PCN-MATCH',
      status: 'accepted',
      categoryCode: 'A0',
      statusCode: '20',
    },
    {
      patientControlNumber: 'PCN-EXTERNAL',
      status: 'accepted',
      categoryCode: 'A0',
      statusCode: '20',
    },
  ],
  raw: 'ISA*277CA~',
};

function remittanceFile(overrides: Partial<RemittanceFile>): RemittanceFile {
  return {
    fileName: '835-new.edi',
    receivedAt: '2026-07-07T09:00:00.000Z',
    checkOrEftNumber: 'EFT-1',
    paymentDate: '2026-07-07',
    payeeNpi: '1234567890',
    totalPaid: 123.45,
    raw835: 'ISA*835~',
    claims: [
      {
        patientControlNumber: 'PCN-PAID',
        payerClaimControlNumber: 'TCN-PAID',
        chargedAmount: 150,
        paidAmount: 123.45,
        claimStatusCode: '1',
        adjustments: [],
        remarks: [],
        serviceLines: [],
      },
      {
        patientControlNumber: 'PCN-DENIED',
        payerClaimControlNumber: 'TCN-DENIED',
        chargedAmount: 75,
        paidAmount: 0,
        claimStatusCode: '4',
        adjustments: [],
        remarks: [],
        serviceLines: [],
      },
    ],
    ...overrides,
  };
}

describe('pollNctracksAcks', () => {
  const mockedCreateAdapter = jest.mocked(createNctracksAdapter);
  const listPending = jest.mocked(repo.listSubmissionsPendingAck);
  const updateAcks = jest.mocked(repo.updateSubmissionAcks);
  const insertX12Audit = jest.mocked(repo.insertX12Audit);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates only pending submissions with matching 277CA patient control numbers', async () => {
    const adapter = createMockAdapter('sftp');
    mockedCreateAdapter.mockReturnValue(adapter);
    listPending.mockResolvedValue([
      pendingSubmission({
        id: 'sub-match',
        claim_id: 'claim-match',
        patient_control_number: 'PCN-MATCH',
        submitted_at: new Date('2026-07-06T10:00:00.000Z'),
      }),
      pendingSubmission({
        id: 'sub-miss',
        claim_id: 'claim-miss',
        patient_control_number: 'PCN-MISS',
        submitted_at: new Date('2026-07-06T10:05:00.000Z'),
      }),
    ]);
    adapter.pollAcks.mockResolvedValue({ ack999: [accepted999], ack277CA: [accepted277] });

    const result = await pollNctracksAcks();

    expect(adapter.pollAcks).toHaveBeenCalledWith('2026-07-06T10:00:00.000Z');
    expect(updateAcks).toHaveBeenCalledTimes(1);
    expect(updateAcks).toHaveBeenCalledWith('sub-match', accepted999, accepted277);
    expect(insertX12Audit).toHaveBeenNthCalledWith(1, {
      claimId: 'claim-match',
      direction: 'inbound',
      transactionType: '277CA',
      patientControlNumber: 'PCN-MATCH',
      payload: 'ISA*277CA~',
      adapterMode: 'sftp',
    });
    expect(insertX12Audit).toHaveBeenNthCalledWith(2, {
      claimId: 'claim-match',
      direction: 'inbound',
      transactionType: '999',
      patientControlNumber: 'PCN-MATCH',
      payload: 'ISA*999~',
      adapterMode: 'sftp',
    });
    expect(result).toEqual({ polled: 2, updated: 1 });
  });

  it('does not poll acknowledgments for non-batch adapter modes', async () => {
    const adapter = createMockAdapter('soap');
    mockedCreateAdapter.mockReturnValue(adapter);

    const result = await pollNctracksAcks();

    expect(listPending).not.toHaveBeenCalled();
    expect(adapter.pollAcks).not.toHaveBeenCalled();
    expect(result).toEqual({ polled: 0, updated: 0 });
  });
});

describe('pollNctracksRemittances', () => {
  const mockedCreateAdapter = jest.mocked(createNctracksAdapter);
  const getWatermark = jest.mocked(repo.getLastRemittanceWatermark);
  const fileExists = jest.mocked(repo.remittanceFileExists);
  const insertFile = jest.mocked(repo.insertRemittanceFile);
  const insertClaim = jest.mocked(repo.insertRemittanceClaim);
  const findClaimId = jest.mocked(repo.findClaimIdByControlNumber);
  const applyRemittance = jest.mocked(repo.applyRemittanceToClaim);
  const insertX12Audit = jest.mocked(repo.insertX12Audit);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deduplicates files and applies only payable remittance rows to matching claims', async () => {
    const adapter = createMockAdapter('sftp');
    mockedCreateAdapter.mockReturnValue(adapter);
    getWatermark.mockResolvedValue('2026-07-01T00:00:00.000Z');
    adapter.retrieveRemittances.mockResolvedValue([
      remittanceFile({ fileName: '835-duplicate.edi' }),
      remittanceFile({ fileName: '835-new.edi' }),
    ]);
    fileExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    insertFile.mockResolvedValue('remit-file-1');
    insertClaim.mockResolvedValueOnce('remit-claim-paid').mockResolvedValueOnce('remit-claim-denied');
    findClaimId.mockResolvedValue('claim-paid');

    const result = await pollNctracksRemittances();

    expect(adapter.retrieveRemittances).toHaveBeenCalledWith({ since: '2026-07-01T00:00:00.000Z' });
    expect(insertFile).toHaveBeenCalledTimes(1);
    expect(insertFile).toHaveBeenCalledWith({
      fileName: '835-new.edi',
      checkOrEftNumber: 'EFT-1',
      paymentDate: '2026-07-07',
      payeeNpi: '1234567890',
      totalPaid: 123.45,
      raw835: 'ISA*835~',
      adapterMode: 'sftp',
      receivedAt: '2026-07-07T09:00:00.000Z',
    });
    expect(insertX12Audit).toHaveBeenCalledWith({
      direction: 'inbound',
      transactionType: '835',
      fileName: '835-new.edi',
      payload: 'ISA*835~',
      adapterMode: 'sftp',
    });
    expect(insertClaim).toHaveBeenCalledTimes(2);
    expect(findClaimId).toHaveBeenCalledTimes(1);
    expect(findClaimId).toHaveBeenCalledWith('PCN-PAID');
    expect(applyRemittance).toHaveBeenCalledWith('remit-claim-paid', 'claim-paid', 12345, 'TCN-PAID');
    expect(result).toEqual({ files: 2, applied: 1 });
  });

  it('skips remittance retrieval for SOAP-only mode', async () => {
    const adapter = createMockAdapter('soap');
    mockedCreateAdapter.mockReturnValue(adapter);

    const result = await pollNctracksRemittances();

    expect(getWatermark).not.toHaveBeenCalled();
    expect(adapter.retrieveRemittances).not.toHaveBeenCalled();
    expect(result).toEqual({ files: 0, applied: 0 });
  });
});
