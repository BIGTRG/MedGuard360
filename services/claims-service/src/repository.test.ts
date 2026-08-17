import { mapClaimRow, dollarsToChargeCents, mapClaimLineRow } from './claim-map';

describe('claims repository mapping', () => {
  it('maps canonical DB row to API claim shape', () => {
    const row = {
      id: '50000000-0000-0000-0000-000000000001',
      claim_control_number: '260517-000101',
      billing_provider_id: '20000000-0000-0000-0000-000000000001',
      patient_id: '10000000-0000-0000-0000-000000000001',
      payer_id: 'NCMEDPAY',
      claim_type: '837P',
      state_code: 'NC',
      service_from: new Date('2026-05-10'),
      total_charge_cents: 15000,
      status: 'paid',
      fraud_score: 12,
      edi_payload: null,
      submitted_at: new Date('2026-05-11'),
      adjudicated_at: new Date('2026-05-12'),
      created_at: new Date('2026-05-09'),
      updated_at: new Date('2026-05-12'),
      created_by: '00000000-0000-0000-0000-000000000003',
    };
    const claim = mapClaimRow(row);
    expect(claim.ccn).toBe('260517-000101');
    expect(claim.provider_user_id).toBe(row.billing_provider_id);
    expect(claim.total_amount).toBe(150);
    expect(claim.paid_at).toEqual(row.adjudicated_at);
  });

  it('does not expose adjudication time as paid_at unless the claim is paid', () => {
    const adjudicatedAt = new Date('2026-05-12');
    const claim = mapClaimRow({
      id: '50000000-0000-0000-0000-000000000002',
      claim_control_number: '260517-000102',
      billing_provider_id: '20000000-0000-0000-0000-000000000001',
      patient_id: '10000000-0000-0000-0000-000000000001',
      payer_id: 'NCMEDPAY',
      claim_type: '837P',
      state_code: 'NC',
      service_from: new Date('2026-05-10'),
      total_charge_cents: '15000',
      status: 'denied',
      fraud_score: null,
      edi_payload: 'ISA*00*',
      submitted_at: new Date('2026-05-11'),
      adjudicated_at: adjudicatedAt,
      created_at: new Date('2026-05-09'),
      updated_at: new Date('2026-05-12'),
      created_by: '00000000-0000-0000-0000-000000000003',
    });

    expect(claim.total_amount).toBe(150);
    expect(claim.paid_at).toBeNull();
  });

  it('maps canonical DB line rows to API claim line shape', () => {
    const serviceDate = new Date('2026-05-10');
    const line = mapClaimLineRow({
      line_number: 2,
      service_code: '99213',
      modifier_1: 'GT',
      modifier_2: '',
      modifier_3: null,
      modifier_4: '95',
      diagnosis_pointers: [1, 3],
      service_date: serviceDate,
      units: '2',
      charge_cents: '9876',
      place_of_service: '02',
    });

    expect(line).toEqual({
      line_number: 2,
      procedure_code: '99213',
      modifier_codes: ['GT', '95'],
      diagnosis_pointers: [1, 3],
      service_date: serviceDate,
      units: '2',
      charge_amount: 98.76,
      place_of_service: '02',
    });
  });

  it('defaults missing diagnosis pointers to an empty array on claim lines', () => {
    const line = mapClaimLineRow({
      line_number: 1,
      service_code: '90834',
      charge_cents: 10000,
    });

    expect(line.diagnosis_pointers).toEqual([]);
    expect(line.modifier_codes).toEqual([]);
    expect(line.charge_amount).toBe(100);
  });

  it('converts dollar amounts to charge cents', () => {
    expect(dollarsToChargeCents(125.5)).toBe(12550);
  });
});