import { calculateHaversineDistance, formatDistance } from './geoMath';

export interface WalkingStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  streetName?: string;
}

export interface WalkingRoute {
  distanceMeters: number;
  distanceKm: number;
  durationMinutes: number;
  polylineCoords: [number, number][]; // [lat, lng]
  steps: WalkingStep[];
  summary: string;
  isFallback?: boolean;
}

interface OSRMStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: {
    type: string;
    modifier?: string;
  };
}

interface OSRMRoute {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][]; // [lon, lat]
  };
  legs?: {
    summary?: string;
    steps?: OSRMStep[];
  }[];
}

interface OSRMResponse {
  code: string;
  routes?: OSRMRoute[];
}

/**
 * Translates OSRM maneuver modifiers into natural Indonesian walking instructions.
 */
function formatIndonesianInstruction(
  type: string,
  modifier: string | undefined,
  streetName: string,
  targetName?: string
): string {
  const street = streetName.trim() ? `ke ${streetName.trim()}` : '';

  if (type === 'depart') {
    return street ? `Mulai jalan kaki menyusuri ${streetName}` : 'Mulai jalan kaki';
  }
  if (type === 'arrive') {
    return targetName ? `Tiba di ${targetName}` : 'Tiba di tujuan';
  }

  switch (modifier) {
    case 'left':
    case 'sharp left':
    case 'slight left':
      return street ? `Belok kiri ${street}` : 'Belok kiri';
    case 'right':
    case 'sharp right':
    case 'slight right':
      return street ? `Belok kanan ${street}` : 'Belok kanan';
    case 'straight':
      return street ? `Lurus terus menyusuri ${streetName}` : 'Lurus terus';
    case 'u-turn':
      return 'Putar balik';
    default:
      return street ? `Lanjut jalan kaki ${street}` : 'Lanjut jalan kaki';
  }
}

/**
 * Generates an offline heuristic walking route if OSRM is unreachable.
 */
export function generateHeuristicWalkingRoute(
  fromCoord: [number, number],
  toCoord: [number, number],
  fromName?: string,
  toName?: string
): WalkingRoute {
  const rawDistMeters = calculateHaversineDistance(fromCoord, toCoord);
  // Pedestrian urban detour factor in Jakarta (~1.25x direct distance)
  const detourDistMeters = Math.round(rawDistMeters * 1.25);
  const distanceKm = Math.round((detourDistMeters / 1000) * 10) / 10;
  // Average pedestrian walking speed: 75 meters / minute (4.5 km/h)
  const durationMinutes = Math.max(1, Math.round(detourDistMeters / 75));

  const destLabel = toName || 'tujuan';

  const steps: WalkingStep[] = [
    {
      instruction: `Mulai jalan kaki dari ${fromName || 'titik awal'}`,
      distanceMeters: Math.round(detourDistMeters * 0.4),
      durationSeconds: Math.round(durationMinutes * 60 * 0.4),
    },
    {
      instruction: `Lanjut jalan kaki di trotoar menuju ${destLabel}`,
      distanceMeters: Math.round(detourDistMeters * 0.6),
      durationSeconds: Math.round(durationMinutes * 60 * 0.6),
    },
    {
      instruction: `Tiba di ${destLabel}`,
      distanceMeters: 0,
      durationSeconds: 0,
    },
  ];

  return {
    distanceMeters: detourDistMeters,
    distanceKm,
    durationMinutes,
    polylineCoords: [fromCoord, toCoord],
    steps,
    summary: `Jalan kaki menuju ${destLabel} (${formatDistance(detourDistMeters)})`,
    isFallback: true,
  };
}

/**
 * Calculates pedestrian route using OSRM Foot Engine with automatic offline heuristic fallback.
 */
export async function calculateWalkingRoute(
  fromCoord: [number, number],
  toCoord: [number, number],
  options?: {
    fromName?: string;
    toName?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  }
): Promise<WalkingRoute> {
  const [lat1, lon1] = fromCoord;
  const [lat2, lon2] = toCoord;

  // If distance is trivially small (< 20m), return instantaneous route
  const directMeters = calculateHaversineDistance(fromCoord, toCoord);
  if (directMeters < 20) {
    return {
      distanceMeters: directMeters,
      distanceKm: 0,
      durationMinutes: 1,
      polylineCoords: [fromCoord, toCoord],
      steps: [
        {
          instruction: `Tiba di ${options?.toName || 'tujuan'}`,
          distanceMeters: directMeters,
          durationSeconds: 30,
        },
      ],
      summary: 'Sudah di lokasi',
      isFallback: false,
    };
  }

  // Setup abort controller for timeout
  const timeoutMs = options?.timeoutMs ?? 3500;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson&steps=true`;

    const res = await fetch(url, {
      signal: options?.signal || controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as OSRMResponse;
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const route = data.routes[0];
        const distMeters = Math.round(route.distance);
        const distKm = Math.round((distMeters / 1000) * 10) / 10;
        const durMinutes = Math.max(1, Math.round(route.duration / 60));

        // Transform geojson [lon, lat] coordinates to Leaflet [lat, lng]
        const polylineCoords: [number, number][] = route.geometry.coordinates.map(
          ([lon, lat]) => [lat, lon]
        );

        const rawSteps = route.legs?.[0]?.steps || [];
        const steps: WalkingStep[] = rawSteps.map((s) => ({
          instruction: formatIndonesianInstruction(
            s.maneuver.type,
            s.maneuver.modifier,
            s.name,
            options?.toName
          ),
          distanceMeters: Math.round(s.distance),
          durationSeconds: Math.round(s.duration),
          streetName: s.name || undefined,
        }));

        const summary =
          route.legs?.[0]?.summary ||
          `Jalan kaki ${formatDistance(distMeters)} (${durMinutes} mnt)`;

        return {
          distanceMeters: distMeters,
          distanceKm: distKm,
          durationMinutes: durMinutes,
          polylineCoords,
          steps,
          summary,
          isFallback: false,
        };
      }
    }
  } catch {
    // Network timeout or error: gracefully fall back to heuristic
  } finally {
    clearTimeout(timeoutId);
  }

  return generateHeuristicWalkingRoute(
    fromCoord,
    toCoord,
    options?.fromName,
    options?.toName
  );
}
