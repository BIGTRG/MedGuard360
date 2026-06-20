import { summarizePsv, runAllPsv } from './psv';

describe('summarizePsv', () => {
  it('reports all clear when no flags or pending', () => {
    const summary = summarizePsv([
      { source: 'npi_registry', status: 'clear', resultSummary: 'ok' },
      { source: 'pecos', status: 'clear', resultSummary: 'ok' },
    ]);
    expect(summary.allClear).toBe(true);
    expect(summary.flagged).toBe(false);
  });

  it('flags manual review when a check fails', () => {
    const summary = summarizePsv([
      { source: 'leie', status: 'flagged', resultSummary: 'match' },
    ]);
    expect(summary.flagged).toBe(true);
    expect(summary.summary).toContain('leie');
  });
});

describe('runAllPsv', () => {
  it('flags invalid NPI format', async () => {
    const results = await runAllPsv({
      providerId: 'p1',
      npi: 'bad',
      stateCode: 'NC',
    });
    const npi = results.find(r => r.source === 'npi_registry');
    expect(npi?.status).toBe('flagged');
  });
});