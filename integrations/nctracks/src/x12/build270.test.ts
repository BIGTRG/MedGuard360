import { loadNctracksConfig } from '../config';
import { build270ForNctracks } from './build270';

describe('build270ForNctracks', () => {
  const config = loadNctracksConfig({});

  it('writes an SE segment count scoped to ST through SE', () => {
    const x12 = build270ForNctracks({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-21',
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1980-01-02',
    }, config, '42');

    const segments = x12.split(/[~\n\r]+/).filter(Boolean);
    const stIndex = segments.findIndex((segment) => segment.startsWith('ST*'));
    const seIndex = segments.findIndex((segment) => segment.startsWith('SE*'));
    const se = segments[seIndex]?.split('*');

    expect(stIndex).toBeGreaterThanOrEqual(0);
    expect(seIndex).toBeGreaterThan(stIndex);
    expect(se?.[1]).toBe(String(seIndex - stIndex + 1));
  });

  it('does not fabricate a subscriber DOB when one is omitted', () => {
    const x12 = build270ForNctracks({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-21',
    }, config, '43');

    expect(x12).not.toContain('19700101');
    expect(x12).not.toContain('DMG*D8');
  });
});
