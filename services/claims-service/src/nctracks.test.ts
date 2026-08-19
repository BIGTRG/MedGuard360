import { shouldUseNctracks, submitNcClaim, indexAck277ByPcn, nctracksPollIntervalMs, dollarsToCents, isRemittancePayable, getNctracksIntegrationStatus, hasUsableNcRecipientId } from './nctracks';
import type { Ack277CA } from '@medguard360/nctracks';

describe('shouldUseNctracks', () => {
  it('routes NC Medicaid claims through NCTracks', () => {
    expect(shouldUseNctracks('NC', 'NCXIX')).toBe(true);
    expect(shouldUseNctracks('NC', 'NC Medicaid FFS')).toBe(true);
  });

  it('does not route commercial NC claims through NCTracks', () => {
    expect(shouldUseNctracks('NC', 'AETNA-COMMERCIAL')).toBe(false);
  });

  it('returns false when mode is disabled', () => {
    const prev = process.env.NCTRACKS_MODE;
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC', 'NCXIX')).toBe(false);
    if (prev === undefined) delete process.env.NCTRACKS_MODE;
    else process.env.NCTRACKS_MODE = prev;
  });
});

describe('hasUsableNcRecipientId', () => {
  it('rejects placeholders and patient UUIDs', () => {
    expect(hasUsableNcRecipientId('UNKNOWN')).toBe(false);
    expect(hasUsableNcRecipientId('10000000-0000-4000-8000-000000000001')).toBe(false);
  });

  it('accepts real NC recipient IDs', () => {
    expect(hasUsableNcRecipientId('NCMD00100001')).toBe(true);
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

  it('fails before submit when no real NC Medicaid recipient ID is available', async () => {
    await expect(submitNcClaim({
      ccn: 'CCN-TEST-UUID',
      totalCharge: 125.5,
      patientMedicaidId: '10000000-0000-4000-8000-000000000001',
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

  it('throws when NCTracks returns an inline rejected acknowledgment', async () => {
    await expect(submitNcClaim({
      ccn: 'CCN-TEST-REJECT',
      totalCharge: 125.5,
      patientMedicaidId: 'NCMD00100001',
      serviceDate: '20260706',
      billingNpi: '1234567890',
      diagnosisCodes: [],
      lines: [{
        procedure_code: '99213',
        modifier_codes: [],
        units: 1,
        charge_amount: 125.5,
        service_date: '20260706',
        place_of_service: '11',
        diagnosis_pointers: [1],
      }],
    })).rejects.toThrow('NCTracks rejected claim functional acknowledgment');
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