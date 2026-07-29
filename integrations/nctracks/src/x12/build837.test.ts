import { build837PForNctracks, claim837FileName } from './build837';
import { loadNctracksConfig } from '../config';
import type { ClaimSubmitRequest } from '../types';

const sampleClaim: ClaimSubmitRequest = {
  claimType: 'professional',
  patientControlNumber: 'PCN-TEST-001',
  totalCharge: 125.5,
  subscriberId: 'NCMD00100007',
  serviceDateFrom: '2026-06-01',
  serviceDateTo: '2026-06-01',
  diagnoses: [{ code: 'J06.9', system: 'ICD10CM' }],
  lines: [{
    procedureCode: '99213',
    units: 1,
    charge: 125.5,
    serviceDate: '2026-06-01',
    placeOfService: '11',
    diagnosisPointers: [1],
  }],
};

describe('build837PForNctracks', () => {
  const config = loadNctracksConfig({ NCTRACKS_MODE: 'stub' });

  it('builds ISA/GS/ST 837 envelope with control numbers', () => {
    const result = build837PForNctracks(sampleClaim, config, '42');
    expect(result.payload).toContain('ISA*');
    expect(result.payload).toContain('ST*837*0001*005010X222A1');
    expect(result.payload).toContain('CLM*PCN-TEST-001*125.50');
    expect(result.interchangeControlNumber).toBe('000000042');
    expect(result.groupControlNumber).toBe('42');
  });

  it('includes prior auth and service lines', () => {
    const result = build837PForNctracks({
      ...sampleClaim,
      priorAuthNumber: 'PA-123',
      lines: [{
        ...sampleClaim.lines[0],
        modifiers: ['25'],
        ndc: { code: '00000000001', qty: 1, unitOfMeasure: 'UN' },
      }],
    }, config, '99');
    expect(result.payload).toContain('REF*G1*PA-123');
    expect(result.payload).toContain('SV1*HC:99213:25*');
    expect(result.payload).toContain('LIN**N4*00000000001');
  });

  it('generates deterministic outbound filename', () => {
    const name = claim837FileName(sampleClaim, '000000001');
    expect(name).toMatch(/^mg360_P_\d+_000000001\.x12$/);
  });
});
