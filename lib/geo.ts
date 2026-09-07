/**
 * Geometric and Geodesic Utilities for Transit Calculations
 */

/**
 * Calculates the great-circle distance between two points on the Earth
 * using the Haversine formula.
 * @returns Distance in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculates initial compass bearing (heading in degrees from 0 to 360)
 * from point A to point B.
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));

  let bearing = toDeg(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;
  return Math.round(bearing);
}

/**
 * Linear interpolation between two coordinates given t in [0, 1]
 */
export function interpolateCoordinates(
  coord1: [number, number],
  coord2: [number, number],
  t: number
): [number, number] {
  const lat = coord1[0] + (coord2[0] - coord1[0]) * t;
  const lng = coord1[1] + (coord2[1] - coord1[1]) * t;
  return [lat, lng];
}

/**
 * Pretty-print distance for human UI (e.g. "350 m" or "1.8 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formats seconds into human-readable duration (e.g. "3 mins", "< 1 min")
 */
export function formatEta(seconds: number): string {
  if (seconds < 60) {
    return '< 1 min';
  }
  const mins = Math.round(seconds / 60);
  return `${mins} min${mins > 1 ? 's' : ''}`;
}
