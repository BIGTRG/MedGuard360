import { computeDueAt } from './engine';

jest.mock('@medguard360/shared', () => ({
  createLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
  }),
  pool: {
    query: jest.fn(),
  },
}));

describe('computeDueAt - SLA windows per CLAUDE.md', () => {
  const base = new Date('2026-05-17T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(base);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('drug: 24h', () => {
    const due = computeDueAt('drug');
    expect(due.getTime() - base.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('expedited: 72h', () => {
    const due = computeDueAt('expedited');
    expect(due.getTime() - base.getTime()).toBe(72 * 60 * 60 * 1000);
  });

  it('standard: 7 days', () => {
    const due = computeDueAt('standard');
    expect(due.getTime() - base.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
