import {
  createNctracksAdapter,
  type Ack277CA,
  type Ack999,
  type ClaimSubmitResult,
  type NctracksAdapter,
  type RemittanceFile,
} from '@medguard360/nctracks';
import {
  shouldUseNctracks,
  submitNcClaim,
  indexAck277ByPcn,
  nctracksPollIntervalMs,
  dollarsToCents,
  isRemittancePayable,
  pollNctracksAcks,
  pollNctracksRemittances,
  recordNctracksSubmission,
} from './nctracks';
import * as repo from './nctracks-repository';
import type { NctracksSubmissionRow } from './nctracks-repository';

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(),
}));

jest.mock('./nctracks-repository', () => ({
  insertNctracksSubmission: jest.fn(),
  insertX12Audit: jest.fn(),
  listSubmissionsPendingAck: jest.fn(),
  updateSubmissionAcks: jest.fn(),
  getLastRemittanceWatermark: jest.fn(),
  remittanceFileExists: jest.fn(),
  insertRemittanceFile: jest.fn(),
  insertRemittanceClaim: jest.fn(),
  findClaimIdByControlNumber: jest.fn(),
  applyRemittanceToClaim: jest.fn(),
}));

const createAdapterMock = createNctracksAdapter as jest.MockedFunction<typeof createNctracksAdapter>;
const repoMock = repo as jest.Mocked<typeof repo>;

function makeAdapter(overrides: Partial<NctracksAdapter>): NctracksAdapter {
  return {
    mode: 'stub',
    checkEligibility: jest.fn(),
    submitClaim: jest.fn(),
    getClaimStatus: jest.fn(),
    retrieveRemittances: jest.fn(),
    pollAcks: jest.fn(),
    healthCheck: jest.fn(),
    ...overrides,
  };
}

function makeSubmission(overrides: Partial<NctracksSubmissionRow>): NctracksSubmissionRow {
  return {
    id: 'submission-1',
    claim_id: 'claim-1',
    patient_control_number: 'PCN-1',
    interchange_control_number: '000000001',
    group_control_number: '1',
    transaction_set_control_number: '0001',
    file_name: 'claim.837',
    adapter_mode: 'sftp',
    submitted_at: new Date('2026-07-30T09:00:00.000Z'),
    ack999_accepted: null,
    ack999_raw: null,
    ack277ca_status: null,
    ack277ca_raw: null,
    ack_polled_at: null,
    payer_claim_control_number: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
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
    const resultFromAdapter: ClaimSubmitResult = {
      interchangeControlNumber: '000000123',
      groupControlNumber: '123',
      transactionSetControlNumber: '0001',
      fileName: 'mg360_P_000000123.837',
      submittedAt: '2026-07-30T10:00:00.000Z',
      ack999: { accepted: true, errors: [], raw: '999-RAW' },
    };
    createAdapterMock.mockReturnValue(makeAdapter({
      mode: 'stub',
      submitClaim: jest.fn().mockResolvedValue(resultFromAdapter),
    }));

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

describe('recordNctracksSubmission', () => {
  it('persists submission metadata and audits outbound/inbound X12 payloads', async () => {
    const result: ClaimSubmitResult = {
      interchangeControlNumber: '000000321',
      groupControlNumber: '321',
      transactionSetControlNumber: '0001',
      fileName: 'claim-321.837',
      submittedAt: '2026-07-30T10:01:00.000Z',
      ack999: { accepted: true, errors: [], raw: '999-RAW' },
      ack277CA: {
        status: 'accepted',
        perClaim: [{ patientControlNumber: 'PCN-321', status: 'accepted', categoryCode: 'A0', statusCode: '20' }],
        raw: '277CA-RAW',
      },
    };
    repoMock.insertNctracksSubmission.mockResolvedValue(makeSubmission({
      id: 'submission-321',
      claim_id: 'claim-321',
      patient_control_number: 'PCN-321',
    }));

    await recordNctracksSubmission('claim-321', 'PCN-321', result, 'sftp', '837P-RAW');

    expect(repoMock.insertNctracksSubmission).toHaveBeenCalledWith('claim-321', 'PCN-321', result, 'sftp');
    expect(repoMock.insertX12Audit).toHaveBeenNthCalledWith(1, {
      claimId: 'claim-321',
      direction: 'outbound',
      transactionType: '837P',
      patientControlNumber: 'PCN-321',
      interchangeControlNumber: '000000321',
      fileName: 'claim-321.837',
      payload: '837P-RAW',
      adapterMode: 'sftp',
    });
    expect(repoMock.insertX12Audit).toHaveBeenNthCalledWith(2, {
      claimId: 'claim-321',
      direction: 'inbound',
      transactionType: '999',
      patientControlNumber: 'PCN-321',
      payload: '999-RAW',
      adapterMode: 'sftp',
    });
    expect(repoMock.insertX12Audit).toHaveBeenNthCalledWith(3, {
      claimId: 'claim-321',
      direction: 'inbound',
      transactionType: '277CA',
      patientControlNumber: 'PCN-321',
      payload: '277CA-RAW',
      adapterMode: 'sftp',
    });
  });
});

describe('pollNctracksAcks', () => {
  it('no-ops outside SFTP/live adapter modes', async () => {
    createAdapterMock.mockReturnValue(makeAdapter({ mode: 'stub' }));

    await expect(pollNctracksAcks()).resolves.toEqual({ polled: 0, updated: 0 });
    expect(repoMock.listSubmissionsPendingAck).not.toHaveBeenCalled();
  });

  it('updates matched 277CA submissions and audits inbound ack payloads', async () => {
    const ack999: Ack999 = { accepted: true, errors: [], raw: '999-ACK' };
    const ack277: Ack277CA = {
      status: 'accepted',
      perClaim: [{ patientControlNumber: 'PCN-MATCH', status: 'accepted', categoryCode: 'A0', statusCode: '20' }],
      raw: '277CA-MATCH',
    };
    const pollAcks = jest.fn().mockResolvedValue({ ack999: [ack999], ack277CA: [ack277] });
    createAdapterMock.mockReturnValue(makeAdapter({ mode: 'sftp', pollAcks }));
    repoMock.listSubmissionsPendingAck.mockResolvedValue([
      makeSubmission({ id: 'submission-match', claim_id: 'claim-match', patient_control_number: 'PCN-MATCH' }),
      makeSubmission({ id: 'submission-unmatched', claim_id: 'claim-unmatched', patient_control_number: 'PCN-MISS' }),
    ]);

    await expect(pollNctracksAcks()).resolves.toEqual({ polled: 2, updated: 1 });

    expect(pollAcks).toHaveBeenCalledWith('2026-07-30T09:00:00.000Z');
    expect(repoMock.updateSubmissionAcks).toHaveBeenCalledTimes(1);
    expect(repoMock.updateSubmissionAcks).toHaveBeenCalledWith('submission-match', ack999, ack277);
    expect(repoMock.insertX12Audit).toHaveBeenNthCalledWith(1, {
      claimId: 'claim-match',
      direction: 'inbound',
      transactionType: '277CA',
      patientControlNumber: 'PCN-MATCH',
      payload: '277CA-MATCH',
      adapterMode: 'sftp',
    });
    expect(repoMock.insertX12Audit).toHaveBeenNthCalledWith(2, {
      claimId: 'claim-match',
      direction: 'inbound',
      transactionType: '999',
      patientControlNumber: 'PCN-MATCH',
      payload: '999-ACK',
      adapterMode: 'sftp',
    });
  });
});

describe('pollNctracksRemittances', () => {
  it('records 835 files and applies only payable rows with matching claims', async () => {
    const file: RemittanceFile = {
      fileName: '835-20260730.edi',
      receivedAt: '2026-07-30T10:02:00.000Z',
      checkOrEftNumber: 'EFT-1',
      paymentDate: '2026-07-30',
      payeeNpi: '1234567890',
      totalPaid: 180,
      raw835: '835-RAW',
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
          chargedAmount: 50,
          paidAmount: 0,
          claimStatusCode: '4',
          adjustments: [],
          remarks: [],
          serviceLines: [],
        },
      ],
    };
    const retrieveRemittances = jest.fn().mockResolvedValue([file]);
    createAdapterMock.mockReturnValue(makeAdapter({ mode: 'sftp', retrieveRemittances }));
    repoMock.getLastRemittanceWatermark.mockResolvedValue('2026-07-29T00:00:00.000Z');
    repoMock.remittanceFileExists.mockResolvedValue(false);
    repoMock.insertRemittanceFile.mockResolvedValue('file-id');
    repoMock.insertRemittanceClaim
      .mockResolvedValueOnce('remit-paid')
      .mockResolvedValueOnce('remit-denied');
    repoMock.findClaimIdByControlNumber.mockResolvedValue('claim-paid');

    await expect(pollNctracksRemittances()).resolves.toEqual({ files: 1, applied: 1 });

    expect(retrieveRemittances).toHaveBeenCalledWith({ since: '2026-07-29T00:00:00.000Z' });
    expect(repoMock.insertRemittanceFile).toHaveBeenCalledWith({
      fileName: '835-20260730.edi',
      checkOrEftNumber: 'EFT-1',
      paymentDate: '2026-07-30',
      payeeNpi: '1234567890',
      totalPaid: 180,
      raw835: '835-RAW',
      adapterMode: 'sftp',
      receivedAt: '2026-07-30T10:02:00.000Z',
    });
    expect(repoMock.insertX12Audit).toHaveBeenCalledWith({
      direction: 'inbound',
      transactionType: '835',
      fileName: '835-20260730.edi',
      payload: '835-RAW',
      adapterMode: 'sftp',
    });
    expect(repoMock.findClaimIdByControlNumber).toHaveBeenCalledTimes(1);
    expect(repoMock.findClaimIdByControlNumber).toHaveBeenCalledWith('PCN-PAID');
    expect(repoMock.applyRemittanceToClaim).toHaveBeenCalledWith('remit-paid', 'claim-paid', 17550, 'TCN-PAID');
  });
});