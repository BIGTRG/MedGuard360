const mockQuery = jest.fn<Promise<{ rows: unknown[] }>, [string, unknown[]?]>();

jest.mock('@medguard360/shared', () => ({
  pool: { query: mockQuery },
}));

import { applyRemittanceToClaim } from './nctracks-repository';

describe('applyRemittanceToClaim', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('marks canonical claims paid without referencing the removed paid_at column', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await applyRemittanceToClaim(
      '70000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000001',
      12550,
    );

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('total_paid_cents = $2');
    expect(sql).toContain('adjudicated_at = now()');
    expect(sql).not.toContain('paid_at');
    expect(params).toEqual([
      '50000000-0000-0000-0000-000000000001',
      12550,
    ]);
  });
});
