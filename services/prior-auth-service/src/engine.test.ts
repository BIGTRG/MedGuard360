jest.mock('@medguard360/shared', () => ({
  createLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
  }),
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '@medguard360/shared';
import { computeDueAt, runClinicalDecisionEngine } from './engine';

describe('computeDueAt — SLA windows per CLAUDE.md', () => {
  const base = new Date('2026-05-17T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(base);
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


interface PoolQueryMock {
  mockReset: () => void;
  mockResolvedValueOnce: (value: { rows: Array<{ id: string; criteria_text: string }> }) => PoolQueryMock;
  mock: {
    calls: Array<[string, unknown[]]>;
  };
}

const poolQuery = pool.query as unknown as PoolQueryMock;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('runClinicalDecisionEngine', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    poolQuery.mockReset();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('uses the state-config PA rule contract and evaluates configured criteria', async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [{ id: 'criteria-1', criteria_text: 'Documented trial of physical therapy for at least 6 weeks.' }],
    });
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({
        pa_required: true,
        expedited_eligible: false,
        criteria_document_id: 'criteria-1',
      }))
      .mockResolvedValueOnce(jsonResponse({
        results: [{
          criterion_text: 'Documented trial of physical therapy for at least 6 weeks.',
          similarity_score: 0.94,
          outcome: 'met',
          explanation: 'Clinical documentation supports the criterion.',
        }],
      }));

    const result = await runClinicalDecisionEngine({
      procedureCode: '97110',
      diagnosisCodes: ['M54.5'],
      clinicalJustification: 'Patient completed 8 weeks of physical therapy with persistent pain.',
      urgency: 'standard',
      stateCode: 'NC',
      payerId: 'NC-MEDICAID',
      authorizationHeader: 'Bearer request-token',
    });

    expect(result.recommendation).toBe('approve');
    expect(result.criteriaEvaluations).toHaveLength(1);

    const [ruleUrl, ruleInit] = fetchSpy.mock.calls[0];
    expect(String(ruleUrl)).toContain('/api/v1/state-config/pa-rule?state=NC&payer=NC-MEDICAID&code=97110');
    expect((ruleInit as RequestInit).headers).toMatchObject({
      authorization: 'Bearer request-token',
      'x-service-caller': 'prior-auth-service',
    });

    const [criteriaSql, criteriaParams] = poolQuery.mock.calls[0];
    expect(criteriaSql).toContain('service_code = $3');
    expect(criteriaSql).not.toContain('procedure_code');
    expect(criteriaParams).toEqual(['NC', 'NC-MEDICAID', '97110']);
  });

  it('does not treat pa_required rules as no-PA approvals', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({
      pa_required: true,
      expedited_eligible: false,
      criteria_document_id: null,
    }));
    poolQuery.mockResolvedValueOnce({ rows: [] });

    const result = await runClinicalDecisionEngine({
      procedureCode: 'E1390',
      diagnosisCodes: ['J44.9'],
      clinicalJustification: 'Oxygen saturation documented with COPD exacerbation.',
      urgency: 'standard',
      stateCode: 'NC',
      payerId: 'NC-MEDICAID',
      authorizationHeader: 'Bearer request-token',
    });

    expect(result.recommendation).toBe('needs_more_info');
    expect(result.explanation).toContain('Prior authorization is required');
  });
});