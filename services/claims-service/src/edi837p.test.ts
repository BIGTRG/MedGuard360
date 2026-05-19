import { build837p, makeCcn, EdiContext } from './edi837p';
import { ClaimRow, ClaimLineRow } from './types';

describe('build837p', () => {
  const context: EdiContext = {
    sender:   { qualifier: 'ZZ', id: 'MEDGUARD', name: 'MedGuard' },
    receiver: { qualifier: 'ZZ', id: 'NCMEDPAY', name: 'NC Medicaid' },
    interchangeControlNumber: '000000001',
    groupControlNumber: '000000001',
    productionMode: 'T',
  };

  const claim: ClaimRow = {
    id: 'c1', claim_control_number: '260517-000001', patient_id: 'pt1',
    billing_provider_id: 'p1', rendering_provider_id: null, payer_id: 'NCMEDPAY',
    state_code: 'NC', claim_type: '837P', service_from: '2026-05-10', service_to: '2026-05-10',
    diagnosis_codes: ['F32.9'], total_charge_cents: '15000', total_paid_cents: null,
    status: 'draft', pa_request_id: null, edi_payload: null, edi_generated_at: null,
    submitted_at: null, adjudicated_at: null, fraud_score: null, fraud_recommendation: null,
    created_at: new Date(), updated_at: new Date(),
  };

  const lines: ClaimLineRow[] = [{
    id: 'l1', claim_id: 'c1', line_number: 1,
    service_code: '99213', service_code_type: 'CPT',
    modifier_1: null, modifier_2: null, modifier_3: null, modifier_4: null,
    units: '1', charge_cents: '15000', diagnosis_pointers: [1],
    service_date: '2026-05-10', place_of_service: '11', rendering_provider_id: null,
  }];

  const payload = build837p({
    claim, lines, context,
    billingProvider: { npi: '1234567890', ein: '00-1234567', name: 'Provider Inc.',
                       address: { line1: '1 Main', city: 'Raleigh', state: 'NC', postal: '27601' } },
    patient: { firstName: 'John', lastName: 'Doe', dateOfBirth: '19800101', gender: 'M',
               memberId: 'MID000001', address: { line1: '1 Main', city: 'Raleigh', state: 'NC', postal: '27601' } },
  });

  it('emits a well-formed ISA envelope', () => {
    expect(payload.startsWith('ISA*')).toBe(true);
    expect(payload).toContain('GS*HC*');
    expect(payload).toContain('ST*837*');
  });

  it('includes the claim control number in BHT and CLM', () => {
    expect(payload).toContain('260517-000001');
    expect(payload).toContain('CLM*260517-000001');
  });

  it('emits one LX/SV1/DTP triplet per line', () => {
    expect(payload).toContain('LX*1');
    expect(payload).toContain('SV1*');
    expect(payload).toContain('DTP*472*D8*20260510');
  });

  it('closes with SE/GE/IEA', () => {
    expect(payload).toContain('SE*');
    expect(payload).toContain('GE*1*000000001');
    expect(payload.trim().endsWith('~')).toBe(true);
  });
});

describe('makeCcn', () => {
  it('formats yyMMdd-NNNNNN', () => {
    const ccn = makeCcn(42, new Date(Date.UTC(2026, 4, 17)));
    expect(ccn).toBe('260517-000042');
  });
});
