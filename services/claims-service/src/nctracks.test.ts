import * as nctracksPackage from '@medguard360/nctracks';
import type { Ack277CA, NctracksAdapter, RemittanceFile } from '@medguard360/nctracks';
import * as repo from './nctracks-repository';
import { shouldUseNctracks, submitNcClaim, indexAck277ByPcn, nctracksPollIntervalMs, dollarsToCents, isRemittancePayable, getNctracksIntegrationStatus, pollNctracksRemittances } from './nctracks';

function unusedAdapterMethod(): never {
  throw new Error('unused adapter method in test');
}

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

describe('pollNctracksRemittances', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('applies payable remittances to matched claims and skips duplicates', async () => {
    const duplicateFile: RemittanceFile = {
      fileName: 'DUPLICATE.835',
      receivedAt: '2026-06-15T12:00:00.000Z',
      checkOrEftNumber: 'CHK-DUP',
      paymentDate: '2026-06-15',
      payeeNpi: '1234567890',
      totalPaid: 25,
      claims: [],
      raw835: 'DUPLICATE-RAW-835',
    };
    const newFile: RemittanceFile = {
      fileName: 'NEW.835',
      receivedAt: '2026-06-16T12:00:00.000Z',
      checkOrEftNumber: 'CHK-NEW',
      paymentDate: '2026-06-16',
      payeeNpi: '1234567890',
      totalPaid: 205.5,
      claims: [
        {
          patientControlNumber: 'PCN-PAYABLE',
          payerClaimControlNumber: 'TCN-PAYABLE',
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
        {
          patientControlNumber: 'PCN-UNMATCHED',
          payerClaimControlNumber: 'TCN-UNMATCHED',
          chargedAmount: 30,
          paidAmount: 30,
          claimStatusCode: '2',
          adjustments: [],
          remarks: [],
          serviceLines: [],
        },
      ],
      raw835: 'NEW-RAW-835',
    };
    const retrieveRemittances = jest
      .fn<ReturnType<NctracksAdapter['retrieveRemittances']>, Parameters<NctracksAdapter['retrieveRemittances']>>()
      .mockResolvedValue([duplicateFile, newFile]);
    const adapter: NctracksAdapter = {
      mode: 'sftp',
      checkEligibility: async () => unusedAdapterMethod(),
      submitClaim: async () => unusedAdapterMethod(),
      getClaimStatus: async () => unusedAdapterMethod(),
      retrieveRemittances,
      pollAcks: async () => ({ ack999: [], ack277CA: [] }),
      healthCheck: async () => ({ realtimeOk: false, sftpOk: true }),
    };

    jest.spyOn(nctracksPackage, 'createNctracksAdapter').mockReturnValue(adapter);
    jest.spyOn(repo, 'getLastRemittanceWatermark').mockResolvedValue('2026-06-01T00:00:00.000Z');
    jest.spyOn(repo, 'remittanceFileExists').mockImplementation(async (fileName) => fileName === duplicateFile.fileName);
    jest.spyOn(repo, 'insertRemittanceFile').mockResolvedValue('remit-file-id');
    jest.spyOn(repo, 'insertX12Audit').mockResolvedValue(undefined);
    jest.spyOn(repo, 'insertRemittanceClaim').mockImplementation(async (entry) => `row-${entry.patientControlNumber}`);
    jest.spyOn(repo, 'findClaimIdByControlNumber').mockImplementation(async (pcn) => (
      pcn === 'PCN-PAYABLE' ? 'claim-uuid' : null
    ));
    const applyRemittanceToClaim = jest.spyOn(repo, 'applyRemittanceToClaim').mockResolvedValue(undefined);

    const result = await pollNctracksRemittances();

    expect(result).toEqual({ files: 2, applied: 1 });
    expect(retrieveRemittances).toHaveBeenCalledWith({ since: '2026-06-01T00:00:00.000Z' });
    expect(repo.insertRemittanceFile).toHaveBeenCalledTimes(1);
    expect(repo.insertRemittanceClaim).toHaveBeenCalledTimes(3);
    expect(repo.findClaimIdByControlNumber).toHaveBeenCalledWith('PCN-PAYABLE');
    expect(repo.findClaimIdByControlNumber).not.toHaveBeenCalledWith('PCN-DENIED');
    expect(repo.findClaimIdByControlNumber).toHaveBeenCalledWith('PCN-UNMATCHED');
    expect(applyRemittanceToClaim).toHaveBeenCalledTimes(1);
    expect(applyRemittanceToClaim).toHaveBeenCalledWith('row-PCN-PAYABLE', 'claim-uuid', 17550, 'TCN-PAYABLE');
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