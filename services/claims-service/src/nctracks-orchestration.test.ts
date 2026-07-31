import {
  createNctracksAdapter,
  type Ack277CA,
  type Ack999,
  type ClaimSubmitResult,
  type NctracksAdapter,
  type NctracksMode,
  type RemittanceFile,
} from '@medguard360/nctracks';
import {
  logger,
  nctracksAck999RejectTotal,
  nctracksBatchFilesIn,
} from '@medguard360/shared';
import * as repo from './nctracks-repository';
import {
  pollNctracksAcks,
  pollNctracksRemittances,
  recordNctracksSubmission,
} from './nctracks';

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(),
}));

jest.mock('@medguard360/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
  nctracksBatchFilesIn: {
    inc: jest.fn(),
  },
  nctracksBatchFilesOut: {
    inc: jest.fn(),
  },
  nctracksAck999RejectTotal: {
    inc: jest.fn(),
  },
  observeNctracksRealtime: jest.fn(
    async <T>(_txn: '270' | '271' | '276' | '277', fn: () => Promise<T>) => fn(),
  ),
}));

jest.mock('./nctracks-repository', () => ({
  insertNctracksSubmission: jest.fn(),
  listSubmissionsPendingAck: jest.fn(),
  updateSubmissionAcks: jest.fn(),
  insertX12Audit: jest.fn(),
  getLastRemittanceWatermark: jest.fn(),
  remittanceFileExists: jest.fn(),
  insertRemittanceFile: jest.fn(),
  insertRemittanceClaim: jest.fn(),
  findClaimIdByControlNumber: jest.fn(),
  applyRemittanceToClaim: jest.fn(),
  getNctracksIntegrationStats: jest.fn(),
  listX12AuditOlderThan: jest.fn(),
  deleteX12AuditByIds: jest.fn(),
  insertX12ArchiveManifest: jest.fn(),
}));

const createAdapterMock = jest.mocked(createNctracksAdapter);
const repoMock = jest.mocked(repo);
const batchFilesInIncMock = jest.mocked(nctracksBatchFilesIn.inc);
const ack999RejectIncMock = jest.mocked(nctracksAck999RejectTotal.inc);
const loggerWarnMock = jest.mocked(logger.warn);

function makeAdapter(mode: NctracksMode): jest.Mocked<NctracksAdapter> {
  return {
    mode,
    checkEligibility: jest.fn<
      ReturnType<NctracksAdapter['checkEligibility']>,
      Parameters<NctracksAdapter['checkEligibility']>
    >(),
    submitClaim: jest.fn<
      ReturnType<NctracksAdapter['submitClaim']>,
      Parameters<NctracksAdapter['submitClaim']>
    >(),
    getClaimStatus: jest.fn<
      ReturnType<NctracksAdapter['getClaimStatus']>,
      Parameters<NctracksAdapter['getClaimStatus']>
    >(),
    retrieveRemittances: jest.fn<
      ReturnType<NctracksAdapter['retrieveRemittances']>,
      Parameters<NctracksAdapter['retrieveRemittances']>
    >(),
    pollAcks: jest.fn<
      ReturnType<NctracksAdapter['pollAcks']>,
      Parameters<NctracksAdapter['pollAcks']>
    >(),
    healthCheck: jest.fn<
      ReturnType<NctracksAdapter['healthCheck']>,
      Parameters<NctracksAdapter['healthCheck']>
    >(),
  };
}

function pendingSubmission(
  id: string,
  claimId: string,
  patientControlNumber: string,
  submittedAt: Date,
): repo.NctracksSubmissionRow {
  return {
    id,
    claim_id: claimId,
    patient_control_number: patientControlNumber,
    interchange_control_number: `ISA-${id}`,
    group_control_number: `GS-${id}`,
    transaction_set_control_number: `ST-${id}`,
    file_name: `${id}.x12`,
    adapter_mode: 'sftp',
    submitted_at: submittedAt,
    ack999_accepted: null,
    ack999_raw: null,
    ack277ca_status: null,
    ack277ca_raw: null,
    ack_polled_at: null,
    payer_claim_control_number: null,
  };
}

function ack277(patientControlNumber: string, status: Ack277CA['status']): Ack277CA {
  return {
    status,
    perClaim: [{
      patientControlNumber,
      status,
      categoryCode: status === 'accepted' ? 'A0' : 'A7',
      statusCode: status === 'accepted' ? '20' : '21',
    }],
    raw: `277-${patientControlNumber}`,
  };
}

function remittanceFile(
  fileName: string,
  claims: RemittanceFile['claims'],
): RemittanceFile {
  return {
    fileName,
    receivedAt: '2026-07-30T10:00:00.000Z',
    checkOrEftNumber: `CHK-${fileName}`,
    paymentDate: '2026-07-30',
    payeeNpi: '1234567890',
    totalPaid: claims.reduce((sum, claim) => sum + claim.paidAmount, 0),
    claims,
    raw835: `835-${fileName}`,
  };
}

function remittanceClaim(
  patientControlNumber: string,
  paidAmount: number,
  claimStatusCode: string,
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

describe('NCTracks ack polling orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not poll repository state outside SFTP-backed modes', async () => {
    createAdapterMock.mockReturnValue(makeAdapter('stub'));

    await expect(pollNctracksAcks()).resolves.toEqual({ polled: 0, updated: 0 });
    expect(repoMock.listSubmissionsPendingAck).not.toHaveBeenCalled();
  });

  it('updates each pending submission matched by 277CA and records inbound X12 audits', async () => {
    const adapter = makeAdapter('sftp');
    const ack999: Ack999 = {
      accepted: false,
      errors: [{ segment: 'CLM', code: '1', description: 'Rejected by payer' }],
      raw: '999-reject',
    };
    const firstAck277 = ack277('PCN-1', 'accepted');
    const secondAck277 = ack277('PCN-2', 'rejected');
    adapter.pollAcks.mockResolvedValue({ ack999: [ack999], ack277CA: [firstAck277, secondAck277] });
    createAdapterMock.mockReturnValue(adapter);
    repoMock.listSubmissionsPendingAck.mockResolvedValue([
      pendingSubmission('sub-1', 'claim-1', 'PCN-1', new Date('2026-07-29T10:00:00.000Z')),
      pendingSubmission('sub-2', 'claim-2', 'PCN-2', new Date('2026-07-30T10:00:00.000Z')),
    ]);
    repoMock.updateSubmissionAcks.mockResolvedValue();
    repoMock.insertX12Audit.mockResolvedValue();

    await expect(pollNctracksAcks()).resolves.toEqual({ polled: 2, updated: 2 });

    expect(adapter.pollAcks).toHaveBeenCalledWith('2026-07-29T10:00:00.000Z');
    expect(batchFilesInIncMock).toHaveBeenCalledWith({ type: '999' }, 1);
    expect(batchFilesInIncMock).toHaveBeenCalledWith({ type: '277CA' }, 2);
    expect(ack999RejectIncMock).toHaveBeenCalledTimes(1);
    expect(repoMock.updateSubmissionAcks).toHaveBeenNthCalledWith(1, 'sub-1', ack999, firstAck277);
    expect(repoMock.updateSubmissionAcks).toHaveBeenNthCalledWith(2, 'sub-2', ack999, secondAck277);
    expect(repoMock.insertX12Audit).toHaveBeenCalledWith(expect.objectContaining({
      claimId: 'claim-1',
      direction: 'inbound',
      transactionType: '277CA',
      patientControlNumber: 'PCN-1',
      payload: '277-PCN-1',
      adapterMode: 'sftp',
    }));
    expect(repoMock.insertX12Audit).toHaveBeenCalledWith(expect.objectContaining({
      claimId: 'claim-2',
      direction: 'inbound',
      transactionType: '999',
      patientControlNumber: 'PCN-2',
      payload: '999-reject',
      adapterMode: 'sftp',
    }));
  });
});

describe('NCTracks remittance polling orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips duplicate files and applies only payable matched claims', async () => {
    const adapter = makeAdapter('sftp');
    adapter.retrieveRemittances.mockResolvedValue([
      remittanceFile('duplicate.835', [remittanceClaim('PCN-DUP', 50, '1')]),
      remittanceFile('new.835', [
        remittanceClaim('PCN-PAID', 175.5, '1'),
        remittanceClaim('PCN-DENIED', 0, '4'),
        remittanceClaim('PCN-UNMATCHED', 25, '2'),
      ]),
    ]);
    createAdapterMock.mockReturnValue(adapter);
    repoMock.getLastRemittanceWatermark.mockResolvedValue('2026-07-29T00:00:00.000Z');
    repoMock.remittanceFileExists
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    repoMock.insertRemittanceFile.mockResolvedValue('file-new');
    repoMock.insertRemittanceClaim
      .mockResolvedValueOnce('row-paid')
      .mockResolvedValueOnce('row-denied')
      .mockResolvedValueOnce('row-unmatched');
    repoMock.findClaimIdByControlNumber
      .mockResolvedValueOnce('claim-paid')
      .mockResolvedValueOnce(null);
    repoMock.applyRemittanceToClaim.mockResolvedValue();
    repoMock.insertX12Audit.mockResolvedValue();

    await expect(pollNctracksRemittances()).resolves.toEqual({ files: 2, applied: 1 });

    expect(adapter.retrieveRemittances).toHaveBeenCalledWith({ since: '2026-07-29T00:00:00.000Z' });
    expect(repoMock.insertRemittanceFile).toHaveBeenCalledTimes(1);
    expect(repoMock.insertRemittanceFile).toHaveBeenCalledWith(expect.objectContaining({
      fileName: 'new.835',
      adapterMode: 'sftp',
    }));
    expect(repoMock.insertX12Audit).toHaveBeenCalledWith(expect.objectContaining({
      direction: 'inbound',
      transactionType: '835',
      fileName: 'new.835',
      payload: '835-new.835',
      adapterMode: 'sftp',
    }));
    expect(repoMock.findClaimIdByControlNumber).toHaveBeenCalledTimes(2);
    expect(repoMock.findClaimIdByControlNumber).toHaveBeenNthCalledWith(1, 'PCN-PAID');
    expect(repoMock.findClaimIdByControlNumber).toHaveBeenNthCalledWith(2, 'PCN-UNMATCHED');
    expect(repoMock.applyRemittanceToClaim).toHaveBeenCalledTimes(1);
    expect(repoMock.applyRemittanceToClaim).toHaveBeenCalledWith(
      'row-paid',
      'claim-paid',
      17550,
      'TCN-PCN-PAID',
    );
  });

  it('does not retrieve remittances in SOAP-only mode', async () => {
    const adapter = makeAdapter('soap');
    createAdapterMock.mockReturnValue(adapter);

    await expect(pollNctracksRemittances()).resolves.toEqual({ files: 0, applied: 0 });
    expect(adapter.retrieveRemittances).not.toHaveBeenCalled();
  });
});

describe('NCTracks submission audit persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records outbound 837P plus inbound 999 and 277CA payloads when present', async () => {
    const result: ClaimSubmitResult = {
      interchangeControlNumber: 'ISA000000001',
      groupControlNumber: 'GS000000001',
      transactionSetControlNumber: 'ST000000001',
      fileName: 'claim.x12',
      submittedAt: '2026-07-30T10:00:00.000Z',
      ack999: { accepted: true, errors: [], raw: '999-accepted' },
      ack277CA: ack277('PCN-1', 'accepted'),
    };
    repoMock.insertNctracksSubmission.mockResolvedValue(
      pendingSubmission('sub-1', 'claim-1', 'PCN-1', new Date(result.submittedAt)),
    );
    repoMock.insertX12Audit.mockResolvedValue();

    await expect(recordNctracksSubmission(
      'claim-1',
      'PCN-1',
      result,
      'stub',
      '837-payload',
    )).resolves.toBeUndefined();

    expect(repoMock.insertNctracksSubmission).toHaveBeenCalledWith('claim-1', 'PCN-1', result, 'stub');
    expect(repoMock.insertX12Audit).toHaveBeenCalledTimes(3);
    expect(repoMock.insertX12Audit).toHaveBeenNthCalledWith(1, expect.objectContaining({
      claimId: 'claim-1',
      direction: 'outbound',
      transactionType: '837P',
      patientControlNumber: 'PCN-1',
      interchangeControlNumber: 'ISA000000001',
      fileName: 'claim.x12',
      payload: '837-payload',
      adapterMode: 'stub',
    }));
    expect(repoMock.insertX12Audit).toHaveBeenNthCalledWith(2, expect.objectContaining({
      transactionType: '999',
      payload: '999-accepted',
    }));
    expect(repoMock.insertX12Audit).toHaveBeenNthCalledWith(3, expect.objectContaining({
      transactionType: '277CA',
      payload: '277-PCN-1',
    }));
  });

  it('logs and swallows persistence failures so claim submission remains non-fatal', async () => {
    const result: ClaimSubmitResult = {
      interchangeControlNumber: 'ISA000000002',
      groupControlNumber: 'GS000000002',
      transactionSetControlNumber: 'ST000000002',
      fileName: 'claim-2.x12',
      submittedAt: '2026-07-30T10:00:00.000Z',
    };
    repoMock.insertNctracksSubmission.mockRejectedValue(new Error('database unavailable'));

    await expect(recordNctracksSubmission('claim-2', 'PCN-2', result, 'sftp')).resolves.toBeUndefined();

    expect(loggerWarnMock).toHaveBeenCalledWith(
      'nctracks submission persist failed (non-fatal)',
      expect.objectContaining({
        claimId: 'claim-2',
        error: 'database unavailable',
      }),
    );
    expect(repoMock.insertX12Audit).not.toHaveBeenCalled();
  });
});
