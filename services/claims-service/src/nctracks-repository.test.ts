const mockQuery = jest.fn();

jest.mock('@medguard360/shared', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

import { applyRemittanceToClaim } from './nctracks-repository';

describe('nctracks repository remittance application', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('marks canonical claims paid without referencing removed paid_at column', async () => {
    await applyRemittanceToClaim('remit-1', 'claim-1', 17550, 'TCN-1');

    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("status = 'paid'");
    expect(sql).toContain('total_paid_cents = $2');
    expect(sql).toContain('adjudicated_at = now()');
    expect(sql).not.toContain('paid_at');
    expect(params).toEqual(['claim-1', 17550]);
  });
});
