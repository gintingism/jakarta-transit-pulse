/**
 * Pure functions for transit environmental and financial impact comparison.
 * Compares public transit vs ride-hailing (ojek/taxi) and private motor vehicles in Jakarta.
 */

export interface TripImpactMetrics {
  transitFareIdr: number;
  ojolFareIdr: number;
  taxiFareIdr: number;
  costSavedVsOjolIdr: number;
  co2SavedKg: number;
  caloriesBurnedKcal: number;
}

/**
 * Estimates standard ride-hailing (Ojol / Online Taxi) fare in Jabodetabek (Kemenhub Zona II).
 * Motorcycle (Ojol):
 * - Base fare (0 - 4 km): Rp 10.500
 * - Progressive (> 4 km): +Rp 2.600 / km
 * - Platform service fee: Rp 2.000
 *
 * Car (Taksi Online):
 * - Base fare (0 - 4 km): Rp 18.000
 * - Progressive (> 4 km): +Rp 4.500 / km
 * - Platform service fee: Rp 3.000
 */
export function estimateRideHailingCost(
  distanceKm: number,
  vehicle: 'motorcycle' | 'car' = 'motorcycle'
): number {
  const safeDist = Math.max(0.5, distanceKm);
  if (vehicle === 'motorcycle') {
    const base = 10500;
    const fee = 2000;
    if (safeDist <= 4) {
      return base + fee;
    }
    const extraDist = safeDist - 4;
    const total = base + Math.round(extraDist * 2600) + fee;
    return Math.round(total / 100) * 100;
  }

  // Car / Taxi
  const base = 18000;
  const fee = 3000;
  if (safeDist <= 4) {
    return base + fee;
  }
  const extraDist = safeDist - 4;
  const total = base + Math.round(extraDist * 4500) + fee;
  return Math.round(total / 100) * 100;
}

/**
 * Calculates CO2 emission reduction in kilograms compared to personal motorized transport.
 * Jakarta commuter vehicle baseline: ~125g CO2/km vs Electric rail / BRT: ~28g CO2/passenger-km.
 * Net savings: ~97g (0.097 kg) CO2 / passenger-km.
 */
export function calculateCo2SavedKg(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  const saved = distanceKm * 0.097;
  return Math.round(saved * 10) / 10;
}

/**
 * Calculates calories burned during walking legs (first-mile, transfer, last-mile).
 * Standard brisk transit walking rate: ~0.045 kcal per meter (~45 kcal / km).
 */
export function calculateWalkingCalories(walkingMeters: number): number {
  if (walkingMeters <= 0) return 0;
  return Math.round(walkingMeters * 0.045);
}

/**
 * Computes full environmental and budget impact metrics for a computed route plan.
 */
export function calculateTripImpact(
  routeTotalDistanceKm: number,
  transitFareIdr: number,
  totalWalkingMeters: number = 0
): TripImpactMetrics {
  const ojolFareIdr = estimateRideHailingCost(routeTotalDistanceKm, 'motorcycle');
  const taxiFareIdr = estimateRideHailingCost(routeTotalDistanceKm, 'car');
  const costSavedVsOjolIdr = Math.max(0, ojolFareIdr - transitFareIdr);
  const co2SavedKg = calculateCo2SavedKg(routeTotalDistanceKm);
  const caloriesBurnedKcal = calculateWalkingCalories(totalWalkingMeters);

  return {
    transitFareIdr,
    ojolFareIdr,
    taxiFareIdr,
    costSavedVsOjolIdr,
    co2SavedKg,
    caloriesBurnedKcal,
  };
}
