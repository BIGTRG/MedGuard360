import { sendEmail } from './vendors';

describe('sendEmail stub mode', () => {
  const original = process.env.SES_FROM_ADDRESS;

  afterEach(() => {
    if (original) process.env.SES_FROM_ADDRESS = original;
    else delete process.env.SES_FROM_ADDRESS;
  });

  it('returns a stub id when SES is not configured', async () => {
    delete process.env.SES_FROM_ADDRESS;
    const id = await sendEmail({ to: 'demo@example.com', subject: 'Test', body: 'Hello' });
    expect(id).toMatch(/^stub-/);
  });
});