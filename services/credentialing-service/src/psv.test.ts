import { runAllPsv, summarizePsv } from './psv';

describe('PSV checks', () => {
  it('returns 6 checks (one per registry)', async () => {
    const r = await runAllPsv({ providerId: 'p1', npi: '1234567893', stateCode: 'NC' });
    expect(r.length).toBe(6);
    const sources = r.map(x => x.source);
    expect(sources).toEqual(expect.arrayContaining([
      'npi_registry','pecos','leie','sam_gov','state_license_board','dea_registry',
    ]));
  });

  it('flags invalid NPI', async () => {
    const r = await runAllPsv({ providerId: 'p1', npi: 'bogus', stateCode: 'NC' });
    const npi = r.find(x => x.source === 'npi_registry');
    expect(npi?.status).toBe('flagged');
  });

  it('flags malformed DEA number', async () => {
    const r = await runAllPsv({ providerId: 'p1', npi: '1234567893', stateCode: 'NC', deaNumber: 'BAD123' });
    const dea = r.find(x => x.source === 'dea_registry');
    expect(dea?.status).toBe('flagged');
  });

  it('summarizes flagged checks as not-clear', async () => {
    const summary = summarizePsv([
      { source: 'leie',          status: 'flagged', resultSummary: 'possible match' },
      { source: 'pecos',         status: 'clear',   resultSummary: 'ok' },
      { source: 'npi_registry',  status: 'clear',   resultSummary: 'ok' },
    ]);
    expect(summary.flagged).toBe(true);
    expect(summary.allClear).toBe(false);
  });
});
