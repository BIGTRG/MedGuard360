import { shouldUseNctracks, submitNcClaim, indexAck277ByPcn, nctracksPollIntervalMs, dollarsToCents, isRemittancePayable, getNctracksIntegrationStatus, assertNctracksSubmissionAccepted } from './nctracks';
import type { Ack277CA, ClaimSubmitResult } from '@medguard360/nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid claims through NCTracks', () => {
    expect(shouldUseNctracks('NC', 'NCXIX')).toBe(true);
  });

  it('skips NC claims for non-Medicaid payers', () => {
    expect(shouldUseNctracks('NC', 'COMMERCIAL')).toBe(false);
  });

  it('returns false when mode is disabled', () => {
    const prev = process.env.NCTRACKS_MODE;
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC', 'NCXIX')).toBe(false);
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
      payerId: 'NCXIX',
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

  it('rejects placeholder recipient IDs before submitting to NCTracks', async () => {
    await expect(submitNcClaim({
      ccn: 'CCN-TEST-002',
      payerId: 'NCXIX',
      totalCharge: 125.5,
      patientMedicaidId: 'UNKNOWN',
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
    })).rejects.toThrow('real NC Medicaid recipient ID');
  });
});

describe('assertNctracksSubmissionAccepted', () => {
  const baseResult: ClaimSubmitResult = {
    interchangeControlNumber: 'ISA000000001',
    groupControlNumber: 'GS000000001',
    transactionSetControlNumber: 'ST000000001',
    fileName: 'claim.x12',
    submittedAt: '2026-08-12T00:00:00.000Z',
  };

  it('throws for rejected 999 acknowledgments', () => {
    expect(() => assertNctracksSubmissionAccepted({
      ...baseResult,
      ack999: {
        accepted: false,
        errors: [{ segment: 'CLM', code: '1', description: 'Rejected' }],
        raw: 'AK9*R~',
      },
    })).toThrow('999 acknowledgment');
  });

  it('throws for rejected 277CA acknowledgments', () => {
    expect(() => assertNctracksSubmissionAccepted({
      ...baseResult,
      ack277CA: {
        status: 'rejected',
        perClaim: [{
          patientControlNumber: 'CCN-TEST-003',
          status: 'rejected',
          categoryCode: 'A7',
          statusCode: '21',
        }],
        raw: 'STC*A7:21~',
      },
    })).toThrow('277CA acknowledgment');
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