import { hashRefreshToken } from './repository';

describe('hashRefreshToken', () => {
  it('returns deterministic sha256 hex', () => {
    const hash = hashRefreshToken('demo-refresh-token');
    expect(hash).toBe(hashRefreshToken('demo-refresh-token'));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});