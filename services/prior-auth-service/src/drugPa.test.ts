import { query } from '@medguard360/shared';
import { buildNcpdpPaResponse, checkFormulary } from './drugPa';
import type { FormularyEntry } from './drugPa';

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

function formularyEntry(overrides: Partial<FormularyEntry>): FormularyEntry {
  return {
    id: 'formulary-1',
    payer_id: 'payer-nc',
    state_code: 'NC',
    ndc_code: '12345-6789-01',
    drug_name: 'Example Drug',
    tier: 'preferred',
    prior_auth_required: false,
    step_therapy_required: false,
    quantity_limit: null,
    copay_cents: null,
    ...overrides,
  };
}

describe('checkFormulary', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('requires PA for off-formulary drugs as exception requests', async () => {
    mockRows([]);

    const result = await checkFormulary('payer-nc', '99999-9999-99');

    expect(result.found).toBe(false);
    expect(result.pa_required).toBe(true);
    expect(result.step_therapy_required).toBe(false);
    expect(result.reason).toContain('off-formulary exception request');
    expect(queryMock).toHaveBeenCalledWith(
      'drugPa.formulary',
      expect.stringContaining('FROM drug_formulary'),
      ['payer-nc', '99999-9999-99'],
    );
  });

  it('routes excluded drugs to PA/appeal handling without step therapy', async () => {
    const entry = formularyEntry({
      tier: 'excluded',
      prior_auth_required: false,
      step_therapy_required: true,
    });
    mockRows([entry]);

    const result = await checkFormulary('payer-nc', entry.ndc_code);

    expect(result.found).toBe(true);
    expect(result.entry).toBe(entry);
    expect(result.pa_required).toBe(true);
    expect(result.step_therapy_required).toBe(false);
    expect(result.reason).toContain('excluded list');
  });

  it('does not require PA for preferred formulary drugs without a PA flag', async () => {
    const entry = formularyEntry({ tier: 'preferred' });
    mockRows([entry]);

    const result = await checkFormulary('payer-nc', entry.ndc_code);

    expect(result).toMatchObject({
      found: true,
      entry,
      pa_required: false,
      step_therapy_required: false,
    });
    expect(result.reason).toContain('preferred tier');
  });

  it('preserves PA and step-therapy requirements from active formulary rows', async () => {
    const entry = formularyEntry({
      tier: 'non_preferred',
      prior_auth_required: true,
      step_therapy_required: true,
    });
    mockRows([entry]);

    const result = await checkFormulary('payer-nc', entry.ndc_code);

    expect(result).toMatchObject({
      found: true,
      entry,
      pa_required: true,
      step_therapy_required: true,
      reason: 'PA required for non_preferred tier drug.',
    });
  });
});

describe('buildNcpdpPaResponse', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-18T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds a deterministic NCPDP PA response body with uppercase status', () => {
    const payload = buildNcpdpPaResponse({
      paId: 'pa-123',
      drugPaStatus: 'needs_more_info',
      ndcCode: '12345-6789-01',
      denialReason: 'Missing A1C lab result',
    });

    const parsed = JSON.parse(payload) as {
      MessageHeader: { To: string; From: string; MessageID: string; SentTime: string };
      PAResponse: {
        PAID: string;
        Status: string;
        Drug: { NDC: string };
        Reason: string;
      };
    };

    expect(parsed).toEqual({
      MessageHeader: {
        To: 'PBM',
        From: 'MEDGUARD360',
        MessageID: 'pa-123',
        SentTime: '2026-06-18T10:00:00.000Z',
      },
      PAResponse: {
        PAID: 'pa-123',
        Status: 'NEEDS_MORE_INFO',
        Drug: { NDC: '12345-6789-01' },
        Reason: 'Missing A1C lab result',
      },
    });
  });
});
