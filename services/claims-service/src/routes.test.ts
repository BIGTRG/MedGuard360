import { CreateClaimSchema, ClaimLineSchema, UpdateStatusSchema } from './validation';

const uuid = '00000000-0000-0000-0000-000000000001';

describe('claims route schemas', () => {
  it('accepts a valid NC professional claim payload', () => {
    const parsed = CreateClaimSchema.parse({
      patient_id: uuid,
      payer_id: 'NCXIX',
      claim_type: 'professional',
      state_code: 'NC',
      service_date: '2026-07-06',
      total_amount: 125.5,
      lines: [{
        line_number: 1,
        procedure_code: '99213',
        modifier_codes: ['GT'],
        diagnosis_pointers: [1],
        service_date: '2026-07-06',
        units: 1,
        unit_type: 'UN',
        charge_amount: 125.5,
        place_of_service: '11',
      }],
    });

    expect(parsed.state_code).toBe('NC');
    expect(parsed.lines[0].modifier_codes).toEqual(['GT']);
  });

  it('rejects empty claim line arrays before persistence or NCTracks submission', () => {
    expect(() => CreateClaimSchema.parse({
      patient_id: uuid,
      payer_id: 'NCXIX',
      claim_type: 'professional',
      state_code: 'NC',
      service_date: '2026-07-06',
      total_amount: 125.5,
      lines: [],
    })).toThrow();
  });

  it('rejects malformed modifier codes on claim lines', () => {
    expect(() => ClaimLineSchema.parse({
      line_number: 1,
      procedure_code: '99213',
      modifier_codes: ['TELE'],
      service_date: '2026-07-06',
      units: 1,
      charge_amount: 125.5,
    })).toThrow();
  });

  it('bounds payer fraud scores to the 0 to 100 scoring range', () => {
    expect(UpdateStatusSchema.parse({ status: 'accepted', fraud_score: 100 }).fraud_score).toBe(100);
    expect(() => UpdateStatusSchema.parse({ status: 'accepted', fraud_score: 101 })).toThrow();
    expect(() => UpdateStatusSchema.parse({ status: 'accepted', fraud_score: -1 })).toThrow();
  });
});
