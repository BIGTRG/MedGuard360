import { haversineMiles, totalGpsMiles } from './geo';

describe('haversineMiles', () => {
  it('returns zero for identical coordinates', () => {
    const pt = { lat: 35.7796, lng: -78.6382 };
    expect(haversineMiles(pt, pt)).toBe(0);
  });

  it('sums GPS track segments', () => {
    const miles = totalGpsMiles([
      { lat: 35.7796, lng: -78.6382, t: '2026-06-01T10:00:00Z' },
      { lat: 35.8800, lng: -78.7000, t: '2026-06-01T10:15:00Z' },
    ]);
    expect(miles).toBeGreaterThan(0);
  });
});