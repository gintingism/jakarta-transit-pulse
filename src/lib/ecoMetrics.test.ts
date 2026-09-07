import { describe, it, expect } from 'vitest';
import {
  estimateRideHailingCost,
  calculateCo2SavedKg,
  calculateWalkingCalories,
  calculateTripImpact,
} from './ecoMetrics';

describe('ecoMetrics - Pure Transit Environmental & Budget Impact Engine', () => {
  describe('estimateRideHailingCost', () => {
    it('calculates short distance base fare for motorcycle (<= 4 km)', () => {
      // 3 km: base Rp 10.500 + fee Rp 2.000 = Rp 12.500
      expect(estimateRideHailingCost(3, 'motorcycle')).toBe(12500);
    });

    it('calculates long distance progressive fare for motorcycle (> 4 km)', () => {
      // 14 km: base Rp 10.500 + 10 km * 2.600 (Rp 26.000) + Rp 2.000 = Rp 38.500
      expect(estimateRideHailingCost(14, 'motorcycle')).toBe(38500);
    });

    it('calculates taxi car fare (> 4 km)', () => {
      // 10 km: base Rp 18.000 + 6 km * 4.500 (Rp 27.000) + Rp 3.000 = Rp 48.000
      expect(estimateRideHailingCost(10, 'car')).toBe(48000);
    });
  });

  describe('calculateCo2SavedKg', () => {
    it('returns 0 for 0 km distance', () => {
      expect(calculateCo2SavedKg(0)).toBe(0);
    });

    it('calculates saved carbon emission in kg', () => {
      // 25 km * 0.097 = 2.425 kg -> 2.4 kg
      expect(calculateCo2SavedKg(25)).toBe(2.4);
    });
  });

  describe('calculateWalkingCalories', () => {
    it('calculates walking calories burned accurately', () => {
      // 1000 meters * 0.045 = 45 kcal
      expect(calculateWalkingCalories(1000)).toBe(45);
      // 500 meters = 23 kcal
      expect(calculateWalkingCalories(500)).toBe(23);
    });
  });

  describe('calculateTripImpact', () => {
    it('calculates complete impact breakdown for a typical commute', () => {
      // 20 km transit route, transit fare Rp 4.000, 800m walk
      const impact = calculateTripImpact(20, 4000, 800);
      expect(impact.ojolFareIdr).toBeGreaterThan(impact.transitFareIdr);
      expect(impact.costSavedVsOjolIdr).toBe(impact.ojolFareIdr - 4000);
      expect(impact.co2SavedKg).toBe(1.9); // 20 * 0.097 = 1.94 -> 1.9
      expect(impact.caloriesBurnedKcal).toBe(36); // 800 * 0.045 = 36
    });
  });
});
