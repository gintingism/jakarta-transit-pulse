/**
 * Pure Haversine formula calculation for great-circle distance between two GPS coordinates.
 * @returns Distance in meters.
 */
export function calculateHaversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats a metric distance into human-friendly representation (m or km).
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formats speed in meters per second (m/s) to km/jam.
 */
export function formatSpeed(speedMps: number | null): string {
  if (speedMps === null || isNaN(speedMps) || speedMps < 0.5) {
    return '0 km/jam';
  }
  const kmh = Math.round(speedMps * 3.6);
  return `${kmh} km/jam`;
}

