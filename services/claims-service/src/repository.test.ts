import { mapClaimRow, mapClaimLineRow, dollarsToChargeCents } from './claim-map';

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

  it('converts dollar amounts to charge cents', () => {
    expect(dollarsToChargeCents(125.5)).toBe(12550);
  });

  it('maps canonical claim line rows with modifiers and cent amounts', () => {
    const line = mapClaimLineRow({
      line_number: 2,
      service_code: '99213',
      modifier_1: '25',
      modifier_2: '',
      modifier_3: 'GT',
      modifier_4: null,
      diagnosis_pointers: [1, 2],
      service_date: new Date('2026-05-10'),
      units: 3,
      charge_cents: '12550',
      place_of_service: '11',
    });

    expect(line).toEqual({
      line_number: 2,
      procedure_code: '99213',
      modifier_codes: ['25', 'GT'],
      diagnosis_pointers: [1, 2],
      service_date: new Date('2026-05-10'),
      units: 3,
      charge_amount: 125.5,
      place_of_service: '11',
    });
  });

  it('defaults missing diagnosis pointers to an empty array', () => {
    const line = mapClaimLineRow({
      line_number: 1,
      service_code: 'H0036',
      units: 1,
      charge_cents: 8750,
      service_date: new Date('2026-05-11'),
      place_of_service: '02',
    });

    expect(line.diagnosis_pointers).toEqual([]);
    expect(line.modifier_codes).toEqual([]);
    expect(line.charge_amount).toBe(87.5);
  });
});