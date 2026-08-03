const mockQuery = jest.fn<Promise<{ rows: unknown[] }>, [string, unknown[]?]>();

jest.mock('@medguard360/shared', () => ({
  pool: { query: mockQuery },
  NotFoundError: class NotFoundError extends Error {
    constructor(resource: string) {
      super(`${resource} not found`);
      this.name = 'NotFoundError';
    }
  },
}));

import { createClaim } from './repository';

describe('createClaim', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('stores the resolved provider profile id in billing_provider_id', async () => {
    const providerProfileId = '20000000-0000-0000-0000-000000000001';
    mockQuery
      .mockResolvedValueOnce({ rows: [{ nextval: '42' }] })
      .mockResolvedValueOnce({ rows: [{ id: '50000000-0000-0000-0000-000000000001' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: '50000000-0000-0000-0000-000000000001',
          claim_control_number: '260803-000042',
          billing_provider_id: providerProfileId,
          patient_id: '10000000-0000-0000-0000-000000000001',
          payer_id: 'NCXIX',
          claim_type: '837P',
          state_code: 'NC',
          service_from: new Date('2026-08-03'),
          total_charge_cents: 12550,
          status: 'draft',
          fraud_score: null,
          edi_payload: null,
          submitted_at: null,
          adjudicated_at: null,
          created_at: new Date('2026-08-03'),
          updated_at: new Date('2026-08-03'),
          created_by: '00000000-0000-0000-0000-000000000003',
        }],
      });

    await createClaim({
      encounter_id: null,
      provider_user_id: providerProfileId,
      patient_id: '10000000-0000-0000-0000-000000000001',
      payer_id: 'NCXIX',
      claim_type: '837P',
      state_code: 'NC',
      service_date: new Date('2026-08-03'),
      total_amount: 125.5,
      status: 'draft',
      created_by: '00000000-0000-0000-0000-000000000003',
    });

    const [, params] = mockQuery.mock.calls[1];
    expect(params?.[2]).toBe(providerProfileId);
  });
});
