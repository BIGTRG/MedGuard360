import { createNctracksAdapter } from './index';
import { loadNctracksConfig } from './config';

describe('createNctracksAdapter factory', () => {
  it('returns a stub adapter when mode=stub (default)', () => {
    const a = createNctracksAdapter({ envSource: {} });
    expect(a.mode).toBe('stub');
  });

  it('passes config through when explicitly provided', () => {
    const cfg = loadNctracksConfig({});
    const a = createNctracksAdapter({ config: cfg });
    expect(a.mode).toBe('stub');
  });

  it('throws NotImplementedError for mode=soap with a pointer to the spec', () => {
    expect(() => createNctracksAdapter({
      envSource: {
        NCTRACKS_MODE: 'soap',
        NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
        NCTRACKS_CLIENT_CERT: 'cert',
        NCTRACKS_CLIENT_KEY:  'key',
      },
    })).toThrow(/not yet implemented/);
  });

  it('throws NotImplementedError for mode=sftp with a pointer to the spec', () => {
    expect(() => createNctracksAdapter({
      envSource: {
        NCTRACKS_MODE: 'sftp',
        NCTRACKS_BATCH_SFTP_HOST: 'sftp.example.com',
        NCTRACKS_BATCH_SFTP_USER: 'user',
        NCTRACKS_SFTP_PRIVATE_KEY: '-----PRIVATE KEY-----',
      },
    })).toThrow(/not yet implemented/);
  });

  it('errors are loud at boot (not lazy at first call)', () => {
    // Just confirm the throw happens before any adapter method is reached.
    expect(() => createNctracksAdapter({ envSource: { NCTRACKS_MODE: 'soap', NCTRACKS_REALTIME_ELIGIBILITY_URL: 'x', NCTRACKS_CLIENT_CERT: 'c', NCTRACKS_CLIENT_KEY: 'k' } }))
      .toThrow();
  });
});
