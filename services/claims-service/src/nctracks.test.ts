import {
  shouldUseNctracks,
  submitNcClaim,
  indexAck277ByPcn,
  indexAck999ByGroupControlNumber,
  nctracksPollIntervalMs,
  dollarsToCents,
  isRemittancePayable,
  getNctracksIntegrationStatus,
  ensureAcceptedNctracksSubmission,
  isValidNctracksRecipientId,
} from './nctracks';
import type { Ack277CA, Ack999 } from '@medguard360/nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid claims through NCTracks', () => {
    expect(shouldUseNctracks('NC', 'NCXIX')).toBe(true);
  });

  it('does not route NC commercial claims through NCTracks', () => {
    expect(shouldUseNctracks('NC', 'BCBSNC')).toBe(false);
  });

  it('returns false when mode is disabled', () => {
    const prev = process.env.NCTRACKS_MODE;
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC', 'NCXIX')).toBe(false);
    if (prev === undefined) delete process.env.NCTRACKS_MODE;
    else process.env.NCTRACKS_MODE = prev;
  });
});

describe('isValidNctracksRecipientId', () => {
  it('rejects placeholders and UUIDs before claim submission', () => {
    expect(isValidNctracksRecipientId('UNKNOWN')).toBe(false);
    expect(isValidNctracksRecipientId('10000000-0000-0000-0000-000000000001')).toBe(false);
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

describe('indexAck999ByGroupControlNumber', () => {
  it('indexes functional acknowledgments by AK1 group control number', () => {
    const acks: Ack999[] = [
      { accepted: true, functionalGroupControlNumber: 'GS0001', errors: [], raw: 'AK1*HC*GS0001~AK9*A*1*1*1~' },
      { accepted: false, functionalGroupControlNumber: 'GS0002', errors: [], raw: 'AK1*HC*GS0002~AK9*R*1*0*1~' },
    ];
    const map = indexAck999ByGroupControlNumber(acks);
    expect(map.get('GS0001')?.accepted).toBe(true);
    expect(map.get('GS0002')?.accepted).toBe(false);
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

  it('rejects placeholder recipient IDs before adapter submission', async () => {
    await expect(submitNcClaim({
      ccn: 'CCN-TEST-002',
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

describe('ensureAcceptedNctracksSubmission', () => {
  it('throws when inline 999 rejects a submitted batch', () => {
    expect(() => ensureAcceptedNctracksSubmission({
      interchangeControlNumber: 'ISA0001',
      groupControlNumber: 'GS0001',
      transactionSetControlNumber: 'ST0001',
      fileName: 'claim.x12',
      submittedAt: '2026-08-13T00:00:00.000Z',
      ack999: {
        accepted: false,
        functionalGroupControlNumber: 'GS0001',
        errors: [{ segment: 'CLM', code: '1', description: 'Rejected' }],
        raw: 'AK1*HC*GS0001~AK9*R*1*0*1~',
      },
    })).toThrow('NCTracks rejected');
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