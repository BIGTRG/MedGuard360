import type {
  Ack277CA,
  Ack999,
  EligibilityResponse,
  EligibilityRequest,
  ClaimStatusRequest,
  ClaimStatusResponse,
  ClaimSubmitRequest,
  ClaimSubmitResult,
  NctracksAdapter,
  RemittanceFile,
  RemittanceQuery,
} from '@medguard360/nctracks';
import type { NctracksSubmissionRow } from './nctracks-repository';

const mockCreateNctracksAdapter = jest.fn<NctracksAdapter, []>();
const mockRetrieveRemittances = jest.fn<Promise<RemittanceFile[]>, [RemittanceQuery?]>();
const mockPollAcks = jest.fn<Promise<{ ack999: Ack999[]; ack277CA: Ack277CA[] }>, [string?]>();

const mockBatchFilesInInc = jest.fn<void, [Record<string, string>, number?]>();
const mockAck999RejectInc = jest.fn<void, []>();
const mockLoggerInfo = jest.fn<void, [string, Record<string, unknown>]>();

const mockListSubmissionsPendingAck = jest.fn<Promise<NctracksSubmissionRow[]>, []>();
const mockUpdateSubmissionAcks = jest.fn<Promise<void>, [string, Ack999 | undefined, Ack277CA | undefined]>();
const mockInsertX12Audit = jest.fn<Promise<void>, [Record<string, unknown>]>();
const mockGetLastRemittanceWatermark = jest.fn<Promise<string | undefined>, []>();
const mockRemittanceFileExists = jest.fn<Promise<boolean>, [string]>();
const mockInsertRemittanceFile = jest.fn<Promise<string>, [Record<string, unknown>]>();
const mockInsertRemittanceClaim = jest.fn<Promise<string>, [Record<string, unknown>]>();
const mockFindClaimIdByControlNumber = jest.fn<Promise<string | null>, [string]>();
const mockApplyRemittanceToClaim = jest.fn<Promise<void>, [string, string, number, string?]>();

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: mockCreateNctracksAdapter,
}));

jest.mock('@medguard360/shared', () => ({
  logger: { info: mockLoggerInfo, warn: jest.fn() },
  nctracksBatchFilesIn: { inc: mockBatchFilesInInc },
  nctracksBatchFilesOut: { inc: jest.fn() },
  nctracksAck999RejectTotal: { inc: mockAck999RejectInc },
  observeNctracksRealtime: jest.fn(),
}));

jest.mock('./nctracks-repository', () => ({
  listSubmissionsPendingAck: mockListSubmissionsPendingAck,
  updateSubmissionAcks: mockUpdateSubmissionAcks,
  insertX12Audit: mockInsertX12Audit,
  getLastRemittanceWatermark: mockGetLastRemittanceWatermark,
  remittanceFileExists: mockRemittanceFileExists,
  insertRemittanceFile: mockInsertRemittanceFile,
  insertRemittanceClaim: mockInsertRemittanceClaim,
  findClaimIdByControlNumber: mockFindClaimIdByControlNumber,
  applyRemittanceToClaim: mockApplyRemittanceToClaim,
}));

import { pollNctracksAcks, pollNctracksRemittances } from './nctracks';

function unusedAsync(): Promise<never> {
  return Promise.reject(new Error('not used in this test'));
}

function makeAdapter(mode: NctracksAdapter['mode'] = 'sftp'): NctracksAdapter {
  return {
    mode,
    checkEligibility: (_req: EligibilityRequest): Promise<EligibilityResponse> => unusedAsync(),
    submitClaim: (_req: ClaimSubmitRequest): Promise<ClaimSubmitResult> => unusedAsync(),
    getClaimStatus: (_req: ClaimStatusRequest): Promise<ClaimStatusResponse> => unusedAsync(),
    retrieveRemittances: mockRetrieveRemittances,
    pollAcks: mockPollAcks,
    healthCheck: async () => ({ realtimeOk: true, sftpOk: true }),
  };
}

const pendingSubmission = (overrides: Partial<NctracksSubmissionRow>): NctracksSubmissionRow => ({
  id: 'sub-1',
  claim_id: 'claim-1',
  patient_control_number: 'PCN-1',
  interchange_control_number: '000000001',
  group_control_number: '1',
  transaction_set_control_number: '0001',
  file_name: 'batch-1.837',
  adapter_mode: 'sftp',
  submitted_at: new Date('2026-06-01T10:00:00.000Z'),
  ack999_accepted: null,
  ack999_raw: null,
  ack277ca_status: null,
  ack277ca_raw: null,
  ack_polled_at: null,
  payer_claim_control_number: null,
  ...overrides,
});

describe('pollNctracksAcks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateNctracksAdapter.mockReturnValue(makeAdapter());
  });

  it('updates only submissions matched by 277CA patient control number and audits inbound acks', async () => {
    const ack999: Ack999 = { accepted: true, errors: [], raw: 'AK9*A*1*1*1~' };
    const ack277CA: Ack277CA = {
      status: 'accepted',
      raw: 'STC*A0:20*20260601*WQ*PCN-2~',
      perClaim: [{ patientControlNumber: 'PCN-2', status: 'accepted', categoryCode: 'A0', statusCode: '20' }],
    };
    mockListSubmissionsPendingAck.mockResolvedValueOnce([
      pendingSubmission({ id: 'sub-1', claim_id: 'claim-1', patient_control_number: 'PCN-1' }),
      pendingSubmission({ id: 'sub-2', claim_id: 'claim-2', patient_control_number: 'PCN-2' }),
    ]);
    mockPollAcks.mockResolvedValueOnce({ ack999: [ack999], ack277CA: [ack277CA] });
    mockUpdateSubmissionAcks.mockResolvedValueOnce();
    mockInsertX12Audit.mockResolvedValue();

    const result = await pollNctracksAcks();

    expect(result).toEqual({ polled: 2, updated: 1 });
    expect(mockPollAcks).toHaveBeenCalledWith('2026-06-01T10:00:00.000Z');
    expect(mockUpdateSubmissionAcks).toHaveBeenCalledWith('sub-2', ack999, ack277CA);
    expect(mockInsertX12Audit).toHaveBeenCalledWith(expect.objectContaining({
      claimId: 'claim-2',
      direction: 'inbound',
      transactionType: '277CA',
      patientControlNumber: 'PCN-2',
      payload: ack277CA.raw,
      adapterMode: 'sftp',
    }));
    expect(mockInsertX12Audit).toHaveBeenCalledWith(expect.objectContaining({
      claimId: 'claim-2',
      direction: 'inbound',
      transactionType: '999',
      patientControlNumber: 'PCN-2',
      payload: ack999.raw,
      adapterMode: 'sftp',
    }));
    expect(mockBatchFilesInInc).toHaveBeenCalledWith({ type: '999' }, 1);
    expect(mockBatchFilesInInc).toHaveBeenCalledWith({ type: '277CA' }, 1);
    expect(mockAck999RejectInc).not.toHaveBeenCalled();
  });
});

describe('pollNctracksRemittances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateNctracksAdapter.mockReturnValue(makeAdapter());
  });

  it('applies payable 835 claims once while skipping duplicate files and non-payable rows', async () => {
    const payableFile: RemittanceFile = {
      fileName: 'RA-001.835',
      receivedAt: '2026-06-15T12:00:00.000Z',
      checkOrEftNumber: 'CHK-123',
      paymentDate: '2026-06-15',
      payeeNpi: '1234567890',
      totalPaid: 175.5,
      raw835: 'BPR*I*175.50~',
      claims: [
        {
          patientControlNumber: 'PCN-PAID',
          payerClaimControlNumber: 'TCN-PAID',
          chargedAmount: 200,
          paidAmount: 175.5,
          claimStatusCode: '1',
          adjustments: [],
          remarks: [],
          serviceLines: [],
        },
        {
          patientControlNumber: 'PCN-DENIED',
          payerClaimControlNumber: 'TCN-DENIED',
          chargedAmount: 150,
          paidAmount: 0,
          claimStatusCode: '4',
          adjustments: [],
          remarks: [],
          serviceLines: [],
        },
      ],
    };
    const duplicateFile: RemittanceFile = {
      ...payableFile,
      fileName: 'RA-DUP.835',
      raw835: 'BPR*I*10.00~',
      claims: [],
    };

    mockGetLastRemittanceWatermark.mockResolvedValueOnce('2026-06-01T00:00:00.000Z');
    mockRetrieveRemittances.mockResolvedValueOnce([duplicateFile, payableFile]);
    mockRemittanceFileExists
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    mockInsertRemittanceFile.mockResolvedValueOnce('file-1');
    mockInsertRemittanceClaim
      .mockResolvedValueOnce('remit-row-1')
      .mockResolvedValueOnce('remit-row-2');
    mockFindClaimIdByControlNumber.mockResolvedValueOnce('claim-paid');
    mockApplyRemittanceToClaim.mockResolvedValueOnce();
    mockInsertX12Audit.mockResolvedValue();

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 2, applied: 1 });
    expect(mockRetrieveRemittances).toHaveBeenCalledWith({ since: '2026-06-01T00:00:00.000Z' });
    expect(mockInsertRemittanceFile).toHaveBeenCalledTimes(1);
    expect(mockInsertX12Audit).toHaveBeenCalledWith(expect.objectContaining({
      direction: 'inbound',
      transactionType: '835',
      fileName: 'RA-001.835',
      payload: payableFile.raw835,
      adapterMode: 'sftp',
    }));
    expect(mockFindClaimIdByControlNumber).toHaveBeenCalledTimes(1);
    expect(mockFindClaimIdByControlNumber).toHaveBeenCalledWith('PCN-PAID');
    expect(mockApplyRemittanceToClaim).toHaveBeenCalledWith('remit-row-1', 'claim-paid', 17550, 'TCN-PAID');
    expect(mockBatchFilesInInc).toHaveBeenCalledWith({ type: '835' }, 2);
  });
});
