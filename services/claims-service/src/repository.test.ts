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

  it('converts dollar amounts to charge cents', () => {
    expect(dollarsToChargeCents(125.5)).toBe(12550);
  });

  it('maps canonical claim line rows and filters blank modifiers', () => {
    const serviceDate = new Date('2026-05-10');
    const line = mapClaimLineRow({
      line_number: 1,
      service_code: 'T1019',
      modifier_1: 'U1',
      modifier_2: '',
      modifier_3: null,
      modifier_4: 'HA',
      diagnosis_pointers: [1, 2],
      service_date: serviceDate,
      units: 4,
      charge_cents: '12550',
      place_of_service: '12',
    });

    expect(line).toEqual({
      line_number: 1,
      procedure_code: 'T1019',
      modifier_codes: ['U1', 'HA'],
      diagnosis_pointers: [1, 2],
      service_date: serviceDate,
      units: 4,
      charge_amount: 125.5,
      place_of_service: '12',
    });
  });

  it('defaults missing claim line diagnosis pointers to an empty list', () => {
    const line = mapClaimLineRow({
      line_number: 2,
      service_code: 'H0031',
      charge_cents: 9000,
    });

    expect(line.diagnosis_pointers).toEqual([]);
    expect(line.modifier_codes).toEqual([]);
    expect(line.charge_amount).toBe(90);
  });
});
