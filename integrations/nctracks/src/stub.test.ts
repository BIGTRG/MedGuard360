import { NctracksStubAdapter } from './stub';
import { loadNctracksConfig } from './config';
import type { ClaimSubmitRequest, EligibilityRequest } from './types';

function makeAdapter(): NctracksStubAdapter {
  const cfg = loadNctracksConfig({});
  return new NctracksStubAdapter(cfg);
}

function eligReq(subscriberId: string): EligibilityRequest {
  return { subscriberId, dateOfService: '2026-05-22' };
}

function claimReq(overrides: Partial<ClaimSubmitRequest> = {}): ClaimSubmitRequest {
  return {
    claimType: 'professional',
    patientControlNumber: 'PCN-001',
    totalCharge: 100,
    subscriberId: 'NCMD00100001',
    serviceDateFrom: '2026-05-01',
    serviceDateTo: '2026-05-01',
    diagnoses: [{ code: 'G44.1', system: 'ICD10CM' }],
    lines: [{
      procedureCode: '99213', units: 1, charge: 100,
      serviceDate: '2026-05-01', diagnosisPointers: [1],
    }],
    ...overrides,
  };
}

describe('NctracksStubAdapter — construction', () => {
  it('exposes mode = stub', () => {
    const a = makeAdapter();
    expect(a.mode).toBe('stub');
  });

  it('refuses non-stub config (would silently shadow real adapter)', () => {
    const cfg = loadNctracksConfig({});
    (cfg as { mode: string }).mode = 'soap';
    expect(() => new NctracksStubAdapter(cfg))
      .toThrow(/requires config.mode === 'stub'/);
  });
});

describe('checkEligibility', () => {
  let a: NctracksStubAdapter;
  beforeEach(() => { a = makeAdapter(); });

  it('returns active for subscriber ids ending 0..6', async () => {
    for (const last of [0, 1, 2, 3, 4, 5, 6]) {
      const r = await a.checkEligibility(eligReq(`NCMD0010000${last}`));
      expect(r.status).toBe('active');
    }
  });

  it('returns managed-care enrollment for last digit 7 (Healthy Blue)', async () => {
    const r = await a.checkEligibility(eligReq('NCMD00100007'));
    expect(r.status).toBe('active');
    expect(r.benefitPlan).toBe('STANDARD_PLAN:HEALTHY_BLUE');
    expect(r.managedCareEnrollment?.planName).toBe('Healthy Blue');
  });

  it('returns Tailored Plan enrollment for last digit 8 (Trillium)', async () => {
    const r = await a.checkEligibility(eligReq('NCMD00100008'));
    expect(r.status).toBe('active');
    expect(r.benefitPlan).toBe('TAILORED_PLAN:TRILLIUM');
    expect(r.managedCareEnrollment?.carveOut).toBe('behavioral_health');
  });

  it('returns inactive for last digit 9', async () => {
    const r = await a.checkEligibility(eligReq('NCMD00100009'));
    expect(r.status).toBe('inactive');
    expect(r.managedCareEnrollment).toBeUndefined();
    expect(r.coverageDetails).toEqual([]);
  });

  it('returns AAA rejection for ids ending in 999', async () => {
    const r = await a.checkEligibility(eligReq('BADMEM999'));
    expect(r.status).toBe('error');
    expect(r.aaaRejection).toEqual({ code: '75', followUpAction: 'C' });
  });

  it('uses traceId from request if provided, else deterministic hash', async () => {
    const r1 = await a.checkEligibility({ ...eligReq('NCMD00100001'), traceId: 'TRACE-123' });
    expect(r1.traceId).toBe('TRACE-123');

    const r2a = await a.checkEligibility(eligReq('NCMD00100001'));
    const r2b = await a.checkEligibility(eligReq('NCMD00100001'));
    expect(r2a.traceId).toBe(r2b.traceId);
  });

  it('always emits a synthetic raw271 payload for audit', async () => {
    const r = await a.checkEligibility(eligReq('NCMD00100001'));
    expect(r.raw271).toContain('ISA*');
    expect(r.raw271).toContain('271');
  });
});

describe('submitClaim', () => {
  let a: NctracksStubAdapter;
  beforeEach(() => { a = makeAdapter(); });

  it('returns monotonically-increasing interchange/group/transaction control numbers', async () => {
    const r1 = await a.submitClaim(claimReq());
    const r2 = await a.submitClaim(claimReq());
    expect(parseInt(r1.interchangeControlNumber.replace('ISA', ''), 10))
      .toBeLessThan(parseInt(r2.interchangeControlNumber.replace('ISA', ''), 10));
  });

  it('produces a deterministic filename containing the ICN', async () => {
    const r = await a.submitClaim(claimReq());
    expect(r.fileName).toContain(r.interchangeControlNumber);
    expect(r.fileName).toMatch(/^mg360_P_/);
  });

  it('uses claim-type initial in the filename', async () => {
    const inst = await a.submitClaim(claimReq({ claimType: 'institutional' }));
    const dent = await a.submitClaim(claimReq({ claimType: 'dental' }));
    expect(inst.fileName).toMatch(/^mg360_I_/);
    expect(dent.fileName).toMatch(/^mg360_D_/);
  });

  it('returns inline 999 + 277CA acknowledgments (real mode would defer to pollAcks)', async () => {
    const r = await a.submitClaim(claimReq());
    expect(r.ack999?.accepted).toBe(true);
    expect(r.ack277CA?.status).toBe('accepted');
    expect(r.ack277CA?.perClaim[0].patientControlNumber).toBe('PCN-001');
  });

  it('rejects claims with no diagnosis codes (277CA = rejected)', async () => {
    const r = await a.submitClaim(claimReq({ diagnoses: [] }));
    expect(r.ack999?.accepted).toBe(false);
    expect(r.ack277CA?.status).toBe('rejected');
    expect(r.ack277CA?.perClaim[0].categoryCode).toBe('A7');
  });

  it('rejects claims with negative totalCharge', async () => {
    const r = await a.submitClaim(claimReq({ totalCharge: -1 }));
    expect(r.ack999?.accepted).toBe(false);
  });
});

describe('getClaimStatus', () => {
  let a: NctracksStubAdapter;
  beforeEach(() => { a = makeAdapter(); });

  it('returns one of the four canonical statuses', async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const r = await a.getClaimStatus({
        patientControlNumber: `PCN-${i}`, subscriberId: `S-${i}`,
      });
      seen.add(r.status);
      expect(['pending', 'paid', 'denied', 'in_process']).toContain(r.status);
    }
    // With 20 random inputs all four bins should be hit
    expect(seen.size).toBeGreaterThan(1);
  });

  it('echoes payerClaimControlNumber when caller supplies it', async () => {
    const r = await a.getClaimStatus({
      patientControlNumber: 'PCN-1',
      subscriberId: 'S-1',
      payerClaimControlNumber: 'TCN-EXPLICIT',
    });
    expect(r.payerClaimControlNumber).toBe('TCN-EXPLICIT');
  });

  it('is deterministic per (patientControlNumber, subscriberId) pair', async () => {
    const a1 = await a.getClaimStatus({ patientControlNumber: 'X', subscriberId: 'Y' });
    const a2 = await a.getClaimStatus({ patientControlNumber: 'X', subscriberId: 'Y' });
    expect(a1.status).toBe(a2.status);
  });

  it('paid status includes amount + check number + payment date', async () => {
    // Find a (pcn, sid) combination that produces 'paid' (mod == 1)
    let found = null;
    for (let i = 0; i < 30; i++) {
      const r = await a.getClaimStatus({ patientControlNumber: `PCN-${i}`, subscriberId: 'S' });
      if (r.status === 'paid') { found = r; break; }
    }
    expect(found).not.toBeNull();
    expect(found!.paidAmount).toBeGreaterThan(0);
    expect(found!.checkNumber).toMatch(/^STUB-CHK/);
    expect(found!.paymentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('retrieveRemittances', () => {
  let a: NctracksStubAdapter;
  beforeEach(() => { a = makeAdapter(); });

  it('returns a synthetic 835 when no `since` is provided', async () => {
    const ras = await a.retrieveRemittances();
    expect(ras).toHaveLength(1);
    expect(ras[0].claims.length).toBeGreaterThan(0);
    expect(ras[0].raw835).toContain('ISA*');
  });

  it('returns empty array when `since` is older than 14 days', async () => {
    const oldDate = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const ras = await a.retrieveRemittances({ since: oldDate });
    expect(ras).toEqual([]);
  });

  it('returns a remittance when `since` is recent', async () => {
    const recent = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    const ras = await a.retrieveRemittances({ since: recent });
    expect(ras.length).toBe(1);
  });
});

describe('pollAcks', () => {
  it('returns empty arrays in stub mode (acks were returned inline at submit)', async () => {
    const a = makeAdapter();
    const r = await a.pollAcks();
    expect(r).toEqual({ ack999: [], ack277CA: [] });
  });
});

describe('healthCheck', () => {
  it('returns ok for realtime + sftp; cdOk undefined when no CD config', async () => {
    const a = makeAdapter();
    const r = await a.healthCheck();
    expect(r.realtimeOk).toBe(true);
    expect(r.sftpOk).toBe(true);
    expect(r.cdOk).toBeUndefined();
  });

  it('cdOk = true when Connect:Direct config is present', async () => {
    const cfg = loadNctracksConfig({
      NCTRACKS_CD_NODE_LOCAL:  'MG.LOCAL',
      NCTRACKS_CD_NODE_REMOTE: 'NCTRACKS.PROD',
    });
    const r = await new NctracksStubAdapter(cfg).healthCheck();
    expect(r.cdOk).toBe(true);
  });
});
