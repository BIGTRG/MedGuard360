import { query } from '@medguard360/shared';
import {
  computeNextRenewal,
  getEngagementSummary,
} from './communityEngagement';
import type { EngagementRecord } from './communityEngagement';

jest.mock('@medguard360/shared', () => ({
  query: jest.fn(),
}));

type MockQuery = (
  operation: string,
  sql: string,
  params?: ReadonlyArray<unknown>,
) => Promise<{ rows: unknown[] }>;

const queryMock = query as unknown as jest.MockedFunction<MockQuery>;

function mockRows<T>(rows: T[]): void {
  queryMock.mockResolvedValueOnce({ rows });
}

function engagementRecord(overrides: Partial<EngagementRecord>): EngagementRecord {
  return {
    id: 'engagement-1',
    patient_id: 'patient-1',
    state_code: 'NC',
    reporting_period: '2026-05',
    hours_documented: 80,
    engagement_type: 'employed',
    exemption_code: null,
    verification_source: 'payroll_attestation',
    status: 'verified',
    verified_at: '2026-05-31T00:00:00.000Z',
    next_renewal_due_at: '2026-12-18T10:00:00.000Z',
    notes: null,
    created_at: '2026-05-31T00:00:00.000Z',
    updated_at: '2026-05-31T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeNextRenewal', () => {
  it('sets the renewal deadline six UTC months after the record date', () => {
    expect(computeNextRenewal(new Date('2026-01-15T12:30:00Z'))).toBe(
      '2026-07-15T12:30:00.000Z',
    );
  });
});

describe('getEngagementSummary', () => {
  beforeEach(() => {
    queryMock.mockReset();
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-18T10:00:00Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the latest verified record over a newer submission and marks 30-day renewal notice', async () => {
    const verified = engagementRecord({
      id: 'verified-old',
      reporting_period: '2026-04',
      status: 'verified',
      next_renewal_due_at: '2026-07-08T10:00:00.000Z',
    });
    const submitted = engagementRecord({
      id: 'submitted-new',
      reporting_period: '2026-05',
      status: 'submitted',
      verification_source: 'self_attestation',
      verified_at: null,
      next_renewal_due_at: '2026-11-30T10:00:00.000Z',
    });
    mockRows([{ id: 'patient-1', state_code: 'NC' }]);
    mockRows([{ community_engagement_rules: { required: true, reason: 'Expansion adult' } }]);
    mockRows([submitted, verified]);

    const summary = await getEngagementSummary('patient-1');

    expect(summary.current_record?.id).toBe('verified-old');
    expect(summary.required).toBe(true);
    expect(summary.rule_reason).toBe('Expansion adult');
    expect(summary.compliance_status).toBe('compliant');
    expect(summary.days_until_renewal).toBe(20);
    expect(summary.notification_window).toBe('30_day');
  });

  it('marks qualifying exemptions as exempt even when the renewal is overdue', async () => {
    const exempt = engagementRecord({
      engagement_type: 'disabled_exempt',
      exemption_code: 'disability',
      next_renewal_due_at: '2026-06-01T10:00:00.000Z',
    });
    mockRows([{ id: 'patient-1', state_code: 'NC' }]);
    mockRows([{ community_engagement_rules: { required: true } }]);
    mockRows([exempt]);

    const summary = await getEngagementSummary('patient-1');

    expect(summary.compliance_status).toBe('exempt');
    expect(summary.notification_window).toBe('overdue');
    expect(summary.days_until_renewal).toBeLessThan(0);
  });

  it('returns not_required when state rules do not require engagement records', async () => {
    mockRows([{ id: 'patient-1', state_code: 'NC' }]);
    mockRows([{ community_engagement_rules: { required: false } }]);
    mockRows([]);

    const summary = await getEngagementSummary('patient-1');

    expect(summary.required).toBe(false);
    expect(summary.current_record).toBeNull();
    expect(summary.compliance_status).toBe('not_required');
    expect(summary.notification_window).toBe('none');
  });

  it('throws a clear error when the patient record is missing', async () => {
    mockRows([]);

    await expect(getEngagementSummary('missing-patient')).rejects.toThrow('patient not found');
    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});
