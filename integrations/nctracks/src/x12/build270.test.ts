import { loadNctracksConfig } from '../config';
import { build270ForNctracks } from './build270';
import type { EligibilityRequest } from '../types';

describe('build270ForNctracks', () => {
  const config = loadNctracksConfig({ NCTRACKS_MODE: 'stub' });
  const req: EligibilityRequest = {
    subscriberId: 'NCMD00100001',
    dateOfService: '2026-07-06',
    providerNpi: '1234567890',
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '1980-01-02',
    traceId: 'TRACE-270-1',
  };

  it('counts only ST-through-SE segments in SE01', () => {
    const x12 = build270ForNctracks(req, config, '77');
    const segments = x12.split(/[~\n\r]+/).filter(Boolean);
    const stIndex = segments.findIndex((s) => s.startsWith('ST*'));
    const se = segments.find((s) => s.startsWith('SE*'));
    expect(stIndex).toBeGreaterThanOrEqual(0);
    expect(se).toBeTruthy();

    const seCount = Number(se?.split('*')[1]);
    const actualTransactionCount = segments.length - stIndex - 2;
    expect(seCount).toBe(actualTransactionCount);
  });
});
