import { PoolClient } from 'pg';
import { AuthClaims } from '../types';
import { setRlsContext, withRlsContext } from './pool';

const mockConnect = jest.fn<() => Promise<PoolClient>>();
const mockPoolEnd = jest.fn<() => Promise<void>>();
const mockPoolOn = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    end: mockPoolEnd,
    on: mockPoolOn,
  })),
}));

function makeClient(): PoolClient {
  return {
    query: jest.fn<() => Promise<{ rows: unknown[] }>>().mockResolvedValue({ rows: [] }),
    release: jest.fn<() => void>(),
  } as unknown as PoolClient;
}

function queryMock(client: PoolClient): jest.MockedFunction<(sql: string) => Promise<{ rows: unknown[] }>> {
  return client.query as jest.MockedFunction<(sql: string) => Promise<{ rows: unknown[] }>>;
}

function releaseMock(client: PoolClient): jest.MockedFunction<() => void> {
  return client.release as jest.MockedFunction<() => void>;
}

const auth: AuthClaims = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'rls@example.com',
  role: 'compliance_officer',
  stateCode: 'NC',
  biometricVerified: true,
  sessionId: 'session-123',
};

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod-32chars-min';
  process.env.PG_PASSWORD = 'test';
});

beforeEach(() => {
  mockConnect.mockReset();
  mockPoolEnd.mockReset();
  mockPoolOn.mockClear();
});

describe('setRlsContext', () => {
  it('sets user, role, and state session variables using SET LOCAL', async () => {
    const client = makeClient();

    await setRlsContext(client, auth.sub, auth.role, auth.stateCode);

    expect(queryMock(client).mock.calls).toEqual([
      [`SET LOCAL app.user_id = '${auth.sub}'`],
      [`SET LOCAL app.role = '${auth.role}'`],
      [`SET LOCAL app.state_code = '${auth.stateCode}'`],
    ]);
  });

  it('rejects malformed context values before they reach Postgres', async () => {
    const client = makeClient();

    await expect(
      setRlsContext(client, "00000000-0000-0000-0000-000000000001'; RESET ROLE; --", auth.role, 'NC'),
    ).rejects.toThrow('Invalid RLS context value');
    expect(queryMock(client)).not.toHaveBeenCalled();
  });

  it('sets an empty state value when the caller is not state scoped', async () => {
    const client = makeClient();

    await setRlsContext(client, auth.sub, auth.role);

    expect(queryMock(client).mock.calls[2]).toEqual([`SET LOCAL app.state_code = ''`]);
  });
});

describe('withRlsContext', () => {
  it('wraps PHI work in a transaction with RLS values set before the callback', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client);

    const result = await withRlsContext(auth, async (rlsClient) => {
      await rlsClient.query('SELECT * FROM patients WHERE id = $1');
      return 'done';
    });

    expect(result).toBe('done');
    expect(queryMock(client).mock.calls).toEqual([
      ['BEGIN'],
      [`SET LOCAL app.user_id = '${auth.sub}'`],
      [`SET LOCAL app.role = '${auth.role}'`],
      [`SET LOCAL app.state_code = '${auth.stateCode}'`],
      ['SELECT * FROM patients WHERE id = $1'],
      ['COMMIT'],
    ]);
    expect(releaseMock(client)).toHaveBeenCalledTimes(1);
  });

  it('rolls back and releases the client when PHI work fails', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client);

    await expect(
      withRlsContext(auth, async () => {
        throw new Error('query failed');
      }),
    ).rejects.toThrow('query failed');

    expect(queryMock(client).mock.calls).toEqual([
      ['BEGIN'],
      [`SET LOCAL app.user_id = '${auth.sub}'`],
      [`SET LOCAL app.role = '${auth.role}'`],
      [`SET LOCAL app.state_code = '${auth.stateCode}'`],
      ['ROLLBACK'],
    ]);
    expect(releaseMock(client)).toHaveBeenCalledTimes(1);
  });
});
