import type { AuthClaims } from '@medguard360/shared';

type MockQueryResult = { rows: unknown[] };

const mockClient = {
  query: jest.fn<Promise<MockQueryResult>, [string, ReadonlyArray<unknown>?]>(),
};

const mockWithRlsContext = jest.fn(
  <T>(_auth: unknown, fn: (client: typeof mockClient) => Promise<T>): Promise<T> => fn(mockClient),
);

jest.mock('@medguard360/shared', () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(resource: string) {
      super(`${resource} not found`);
      this.name = 'NotFoundError';
    }
  },
  query: jest.fn(),
  withRlsContext: mockWithRlsContext,
}));

import { getChart } from './ehr';

const patientId = '10000000-0000-0000-0000-000000000001';
const providerAuth: AuthClaims = {
  sub: '00000000-0000-0000-0000-000000000003',
  email: 'provider@demo.medguard360.com',
  role: 'individual_provider',
  stateCode: 'NC',
  biometricVerified: false,
  sessionId: 'session-1',
};

describe('getChart authorization', () => {
  beforeEach(() => {
    mockClient.query.mockReset();
    mockWithRlsContext.mockClear();
  });

  it('does not load EHR rows when the patient is outside the caller scope', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    await expect(getChart(patientId, providerAuth)).rejects.toThrow('Patient chart not found');

    expect(mockWithRlsContext).toHaveBeenCalledWith(providerAuth, expect.any(Function));
    expect(mockClient.query).toHaveBeenCalledTimes(1);
    expect(mockClient.query.mock.calls[0]?.[0]).toContain('FROM patients');
  });

  it('loads EHR rows after the patient access check succeeds', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: patientId }] });

    const chart = await getChart(patientId, providerAuth);

    expect(chart.patientId).toBe(patientId);
    expect(chart.problems).toEqual([]);
    expect(mockClient.query).toHaveBeenCalledTimes(10);
    expect(mockClient.query.mock.calls[0]?.[1]).toEqual(expect.arrayContaining([
      patientId,
      providerAuth.role,
      providerAuth.stateCode,
      providerAuth.sub,
    ]));
  });
});
