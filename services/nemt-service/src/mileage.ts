/**
 * Mileage calculation utilities for NEMT trip billing.
 *
 * Supports both GPS-coordinate based calculation (Haversine formula)
 * and odometer-based calculation. Falls back gracefully when only
 * partial data is available.
 */

const EARTH_RADIUS_MI = 3958.7613;
const DEFAULT_RATE_PER_MILE = 0.655; // IRS standard mileage rate 2024

/**
 * Convert degrees to radians.
 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine great-circle distance between two GPS coordinates in miles.
 */
function haversineMiles(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

export interface CalculateMilesParams {
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  odometerStart?: number;
  odometerEnd?: number;
}

/**
 * Calculate trip mileage using GPS coordinates (Haversine) or odometer readings.
 *
 * Priority order:
 *  1. Odometer difference (most authoritative for billing)
 *  2. GPS Haversine distance (straight-line lower bound)
 *  3. Returns 0 if neither pair is available
 *
 * Anti-fraud note: real deployments compare GPS-derived vs odometer miles
 * and flag trips where odometer exceeds GPS by > 20% for manual review.
 */
export function calculateMiles(params: CalculateMilesParams): number {
  // Odometer takes priority — it records actual road distance
  if (
    params.odometerStart !== undefined &&
    params.odometerEnd !== undefined &&
    params.odometerEnd >= params.odometerStart
  ) {
    return Math.round((params.odometerEnd - params.odometerStart) * 100) / 100;
  }

  // Fall back to GPS straight-line Haversine
  if (
    params.startLat !== undefined &&
    params.startLng !== undefined &&
    params.endLat !== undefined &&
    params.endLng !== undefined
  ) {
    const miles = haversineMiles(
      params.startLat,
      params.startLng,
      params.endLat,
      params.endLng,
    );
    return Math.round(miles * 100) / 100;
  }

  return 0;
}

/**
 * Calculate the billable trip amount from miles and a per-mile rate.
 *
 * @param miles         - Total miles driven (from calculateMiles)
 * @param ratePerMile   - Dollar rate per mile (e.g. 0.655)
 * @returns             - Total amount in dollars, rounded to 2 decimal places
 */
export function calculateTripAmount(miles: number, ratePerMile: number = DEFAULT_RATE_PER_MILE): number {
  if (miles < 0 || ratePerMile < 0) return 0;
  return Math.round(miles * ratePerMile * 100) / 100;
}
