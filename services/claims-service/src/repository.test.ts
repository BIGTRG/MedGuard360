import { mapClaimRow, dollarsToChargeCents } from './claim-map';

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
});