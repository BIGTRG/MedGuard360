import type { AuthClaims } from '@medguard360/shared';

type MockQueryResult = { rows: unknown[] };

const mockQuery = jest.fn<Promise<MockQueryResult>, [string, string, ReadonlyArray<unknown>?]>();

jest.mock('@medguard360/shared', () => ({
  ForbiddenError: class ForbiddenError extends Error {
    constructor(message = 'Insufficient permissions') {
      super(message);
      this.name = 'ForbiddenError';
    }
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(resource: string) {
      super(`${resource} not found`);
      this.name = 'NotFoundError';
    }
  },
  query: mockQuery,
}));

import { getEngagementSummary, submitRecord } from './communityEngagement';

const patientAuth: AuthClaims = {
  sub: '00000000-0000-0000-0000-000000000004',
  email: 'patient@demo.medguard360.com',
  role: 'patient',
  stateCode: 'NC',
  biometricVerified: false,
  sessionId: 'session-1',
};

const otherPatientId = '10000000-0000-0000-0000-000000000002';

describe('community engagement authorization', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('does not read another patient engagement history', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(getEngagementSummary(otherPatientId, patientAuth)).rejects.toThrow('Patient not found');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]?.[0]).toBe('ce.getPatient');
  });

  it('does not submit a community engagement record for another patient', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(submitRecord({
      patientId: otherPatientId,
      stateCode: 'NC',
      reportingPeriod: '2026-05',
      hoursDocumented: 80,
      engagementType: 'employed',
      verificationSource: 'self_attestation',
      createdBy: patientAuth.sub,
    }, patientAuth)).rejects.toThrow('Patient not found');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]?.[0]).toBe('ce.getPatient');
  });

  it('rejects writes when the supplied state does not match the patient', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: patientAuth.sub, state_code: 'NC' }] });

    await expect(submitRecord({
      patientId: patientAuth.sub,
      stateCode: 'SC',
      reportingPeriod: '2026-05',
      hoursDocumented: 80,
      engagementType: 'employed',
      verificationSource: 'self_attestation',
      createdBy: patientAuth.sub,
    }, patientAuth)).rejects.toThrow('Community engagement state does not match patient state');

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
