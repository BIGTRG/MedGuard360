import { pool } from '@medguard360/shared';
import { saveCriterionEvaluations, setCriterionOverride } from './repository';
import { CriterionEvaluationRow } from './types';

type QueryResult<T> = Promise<{ rows: T[] }>;
type PoolQuery = <T = unknown>(text: string, values?: unknown[]) => QueryResult<T>;

jest.mock('@medguard360/shared', () => ({
  pool: {
    query: jest.fn(),
  },
  withRlsContext: jest.fn(),
  NotFoundError: class NotFoundError extends Error {
    constructor(resource: string) {
      super(`${resource} not found`);
    }
  },
}));

const queryMock = pool.query as unknown as jest.MockedFunction<PoolQuery>;

beforeEach(() => {
  queryMock.mockReset();
});

describe('saveCriterionEvaluations', () => {
  it('persists criterion evaluations using canonical migration columns', async () => {
    queryMock.mockResolvedValue({ rows: [] });

    await saveCriterionEvaluations('pa-123', [
      {
        criterion_text: 'Documented failure of preferred therapy',
        similarity_score: 0.87,
        outcome: 'met',
        explanation: 'Clinical notes cite a failed first-line medication.',
        human_outcome: null,
        human_outcome_at: null,
        human_reviewer_id: null,
      },
      {
        criterion_text: 'Recent lab result attached',
        similarity_score: null,
        outcome: 'indeterminate',
        explanation: null,
        human_outcome: null,
        human_outcome_at: null,
        human_reviewer_id: null,
      },
    ]);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0] ?? [];
    expect(sql).toContain(
      '(pa_request_id, criterion_text, similarity_score, outcome, explanation)',
    );
    expect(sql).toContain('VALUES ($1,$2,$3,$4,$5),($6,$7,$8,$9,$10)');
    expect(sql).not.toContain('match_score');
    expect(sql).not.toContain('ai_outcome');
    expect(params).toEqual([
      'pa-123',
      'Documented failure of preferred therapy',
      0.87,
      'met',
      'Clinical notes cite a failed first-line medication.',
      'pa-123',
      'Recent lab result attached',
      null,
      'indeterminate',
      null,
    ]);
  });

  it('skips the database when there are no evaluations to persist', async () => {
    await saveCriterionEvaluations('pa-123', []);

    expect(queryMock).not.toHaveBeenCalled();
  });
});

describe('setCriterionOverride', () => {
  it('updates only the human override columns for the matching PA criterion', async () => {
    const row: CriterionEvaluationRow = {
      id: 'criterion-123',
      pa_request_id: 'pa-123',
      criterion_text: 'Recent lab result attached',
      similarity_score: null,
      outcome: 'indeterminate',
      explanation: null,
      human_outcome: 'met',
      human_outcome_at: '2026-06-27T10:00:00.000Z',
      human_reviewer_id: 'reviewer-123',
      created_at: new Date('2026-06-27T09:00:00.000Z'),
    };
    queryMock.mockResolvedValue({ rows: [row] });

    const result = await setCriterionOverride('pa-123', 'criterion-123', 'reviewer-123', 'met');

    expect(result).toBe(row);
    const [sql, params] = queryMock.mock.calls[0] ?? [];
    expect(sql).toContain('SET human_outcome     = $3');
    expect(sql).toContain('human_outcome_at  = NOW()');
    expect(sql).toContain('human_reviewer_id = $4');
    expect(sql).toContain('WHERE id = $2 AND pa_request_id = $1');
    expect(params).toEqual(['pa-123', 'criterion-123', 'met', 'reviewer-123']);
  });

  it('returns null when the criterion does not belong to the PA request', async () => {
    queryMock.mockResolvedValue({ rows: [] });

    await expect(
      setCriterionOverride('pa-123', 'criterion-456', 'reviewer-123', 'not_met'),
    ).resolves.toBeNull();
  });
});
