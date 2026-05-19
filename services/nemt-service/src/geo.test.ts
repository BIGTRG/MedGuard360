import { haversineMiles, totalGpsMiles } from './geo';

describe('geo', () => {
  it('haversine roughly matches known city pair distances', () => {
    // Raleigh, NC → Charlotte, NC is ~140 miles
    const d = haversineMiles({ lat: 35.7796, lng: -78.6382 }, { lat: 35.2271, lng: -80.8431 });
    expect(d).toBeGreaterThan(125);
    expect(d).toBeLessThan(150);
  });

  it('sums GPS track', () => {
    const t = totalGpsMiles([
      { lat: 35.0, lng: -78.0, t: '2026-05-17T00:00:00Z' },
      { lat: 35.1, lng: -78.0, t: '2026-05-17T00:05:00Z' },
      { lat: 35.2, lng: -78.0, t: '2026-05-17T00:10:00Z' },
    ]);
    // Each 0.1° lat ≈ 6.9 miles → total ≈ 13.8
    expect(t).toBeGreaterThan(13);
    expect(t).toBeLessThan(15);
  });
});
