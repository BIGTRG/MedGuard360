import { build270ForNctracks } from './build270';
import { loadNctracksConfig } from '../config';

describe('build270ForNctracks', () => {
  it('counts only ST-through-SE segments in SE01', () => {
    const x12 = build270ForNctracks(
      {
        subscriberId: 'NCMD00100001',
        dateOfService: '2026-07-27',
        firstName: 'Jane',
        lastName: 'Doe',
        dob: '1990-01-01',
        providerNpi: '1234567890',
      },
      loadNctracksConfig({}),
      '1',
    );
    const segments = x12.split(/[~\n\r]+/).filter(Boolean);
    const stIndex = segments.findIndex((segment) => segment.startsWith('ST*'));
    const seIndex = segments.findIndex((segment) => segment.startsWith('SE*'));
    const se01 = Number.parseInt(segments[seIndex].split('*')[1], 10);

    expect(stIndex).toBeGreaterThanOrEqual(0);
    expect(seIndex).toBeGreaterThan(stIndex);
    expect(se01).toBe(seIndex - stIndex + 1);
  });
});
