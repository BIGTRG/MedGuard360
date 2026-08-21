import { loadNctracksConfig } from '../config';
import { build270ForNctracks } from './build270';

describe('build270ForNctracks', () => {
  it('sets SE01 to the ST-through-SE transaction segment count', () => {
    const payload = build270ForNctracks(
      {
        subscriberId: 'NCMD00100001',
        dateOfService: '2026-08-21',
        providerNpi: '1234567890',
        traceId: 'TRACE-270',
      },
      loadNctracksConfig({}),
      '123',
    );

    const segments = payload.split(/[~\n\r]+/).filter(Boolean);
    const stIndex = segments.findIndex((segment) => segment.startsWith('ST*'));
    const seIndex = segments.findIndex((segment) => segment.startsWith('SE*'));
    const se01 = Number.parseInt(segments[seIndex]?.split('*')[1] ?? '', 10);

    expect(stIndex).toBeGreaterThanOrEqual(0);
    expect(seIndex).toBeGreaterThan(stIndex);
    expect(se01).toBe(seIndex - stIndex + 1);
  });
});
