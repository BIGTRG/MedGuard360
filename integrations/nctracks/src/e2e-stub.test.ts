import { createNctracksAdapter } from './index';

describe('NCTracks stub E2E round-trip', () => {
  const adapter = createNctracksAdapter({ envSource: { NCTRACKS_MODE: 'stub' } });
  const subscriberId = 'NCMD00100001';
  const patientControlNumber = '260630-000042';
  const serviceDate = '2026-06-30';

  it('270/271 eligibility returns active coverage', async () => {
    const elig = await adapter.checkEligibility({
      subscriberId,
      dateOfService: serviceDate,
      providerNpi: '1234567890',
    });
    expect(elig.status).toBe('active');
    expect(elig.raw271).toContain('ISA*');
    expect(elig.traceId).toBeTruthy();
  });

  it('837 submit returns inline 999 + 277CA acks', async () => {
    const result = await adapter.submitClaim({
      claimType: 'professional',
      patientControlNumber,
      totalCharge: 125.5,
      subscriberId,
      serviceDateFrom: serviceDate,
      serviceDateTo: serviceDate,
      billingProvider: { npi: '1234567890', taxonomy: '261Q00000X' },
      diagnoses: [{ code: 'Z00.00', system: 'ICD10CM' }],
      lines: [{
        procedureCode: '99213',
        units: 1,
        charge: 125.5,
        serviceDate,
        placeOfService: '11',
        diagnosisPointers: [1],
      }],
    });
    expect(result.ack999?.accepted).toBe(true);
    expect(result.ack277CA?.status).toBe('accepted');
    expect(result.fileName).toMatch(/^mg360_P_/);
  });

  it('276/277 claim status returns a defined lifecycle state', async () => {
    const status = await adapter.getClaimStatus({
      patientControlNumber,
      subscriberId,
      serviceDateFrom: serviceDate,
      serviceDateTo: serviceDate,
    });
    expect(['pending', 'paid', 'denied', 'in_process']).toContain(status.status);
    expect(status.raw277).toBeTruthy();
  });

  it('835 remittance poll returns payable claims when since is recent', async () => {
    const files = await adapter.retrieveRemittances({ since: new Date().toISOString() });
    expect(files.length).toBeGreaterThan(0);
    expect(files[0].claims.length).toBeGreaterThan(0);
    expect(files[0].raw835).toContain('CLP*');
  });

  it('health check reports both transports reachable', async () => {
    const health = await adapter.healthCheck();
    expect(health.realtimeOk).toBe(true);
    expect(health.sftpOk).toBe(true);
  });
});