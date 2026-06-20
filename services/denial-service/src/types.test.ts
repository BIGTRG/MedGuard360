import { computeAppealDeadline } from './types';

describe('computeAppealDeadline', () => {
  it('defaults to 90 days from remit date', () => {
    const from = new Date('2026-06-01T12:00:00Z');
    const deadline = computeAppealDeadline(from);
    expect(deadline.getTime() - from.getTime()).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it('accepts custom filing windows', () => {
    const from = new Date('2026-06-01T12:00:00Z');
    const deadline = computeAppealDeadline(from, 120);
    expect(deadline.getTime() - from.getTime()).toBe(120 * 24 * 60 * 60 * 1000);
  });
});