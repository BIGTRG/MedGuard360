import { clerkEnabled } from './clerk';

describe('clerkEnabled', () => {
  const original = process.env.CLERK_SECRET_KEY;

  afterEach(() => {
    if (original) process.env.CLERK_SECRET_KEY = original;
    else delete process.env.CLERK_SECRET_KEY;
  });

  it('returns false when CLERK_SECRET_KEY is unset', () => {
    delete process.env.CLERK_SECRET_KEY;
    expect(clerkEnabled()).toBe(false);
  });

  it('returns true when CLERK_SECRET_KEY is set', () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_demo';
    expect(clerkEnabled()).toBe(true);
  });
});