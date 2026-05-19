import { computeDueAt } from './engine';

describe('computeDueAt — SLA windows per CLAUDE.md', () => {
  const base = new Date('2026-05-17T12:00:00Z');

  it('drug: 24h', () => {
    const due = computeDueAt('drug', base);
    expect(due.getTime() - base.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('expedited: 72h', () => {
    const due = computeDueAt('expedited', base);
    expect(due.getTime() - base.getTime()).toBe(72 * 60 * 60 * 1000);
  });

  it('standard: 7 days', () => {
    const due = computeDueAt('standard', base);
    expect(due.getTime() - base.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
