/**
 * Distance + mileage utilities.
 *
 * Haversine distance over GPS track points. NEMT fraud often hides in
 * inflated mileage; compare claimed miles to actual GPS-derived miles.
 */

export interface GpsPoint { lat: number; lng: number; t: string }

const EARTH_RADIUS_MI = 3958.7613;

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

export function totalGpsMiles(track: GpsPoint[]): number {
  if (track.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < track.length; i++) {
    sum += haversineMiles(track[i - 1], track[i]);
  }
  return sum;
}
