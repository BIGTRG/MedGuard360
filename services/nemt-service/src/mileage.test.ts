import { calculateMiles, calculateTripAmount } from './mileage';

describe('calculateMiles', () => {
  it('prefers odometer delta over GPS', () => {
    const miles = calculateMiles({
      odometerStart: 100,
      odometerEnd: 112.5,
      startLat: 35.0,
      startLng: -78.0,
      endLat: 36.0,
      endLng: -79.0,
    });
    expect(miles).toBe(12.5);
  });

  it('calculates trip amount from miles', () => {
    expect(calculateTripAmount(10, 0.655)).toBeCloseTo(6.55, 2);
  });
});