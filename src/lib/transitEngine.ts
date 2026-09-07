import {
  Station,
  TransitType,
  LineIdentifier,
  STATIONS,
  STATION_MAP,
  TRANSIT_LINES,
  INTERCHANGE_CONNECTIONS,
} from '@/src/data/transitNetwork';
import { calculateHaversineDistance, formatDistance } from './geoMath';
import { calculateWalkingRoute } from './walkingEngine';
import {
  calculateKrlFare,
  calculateTransJakartaFare,
  calculateTjFare,
  calculateBasoettaFare,
  calculateKaiBandaraFare,
  calculateTotalJourneyFare,
  calculateMultiModalFare,
  FareLegBreakdown,
  MultiModalFareResult,
  MultiModalFareLeg,
  JourneyLeg,
  TransitMode,
} from './fareRules';

export {
  calculateHaversineDistance,
  formatDistance,
  calculateKrlFare,
  calculateTransJakartaFare,
  calculateTjFare,
  calculateBasoettaFare,
  calculateKaiBandaraFare,
  calculateTotalJourneyFare,
  calculateMultiModalFare,
};
export {
  calculateTripImpact,
  estimateRideHailingCost,
  calculateCo2SavedKg,
  calculateWalkingCalories,
} from './ecoMetrics';
export type { TripImpactMetrics } from './ecoMetrics';
export type {
  FareLegBreakdown,
  MultiModalFareResult,
  MultiModalFareLeg,
  JourneyLeg,
  TransitMode,
};

export interface RouteSegment {
  id: string;
  lineId: LineIdentifier;
  lineName: string;
  lineColor: string;
  type: TransitType;
  fromStation: Station;
  toStation: Station;
  stops: Station[];
  stopCount: number;
  distanceKm: number;
  durationMinutes: number;
  fareIdr: number;
  instruction: string;
  polylineCoords?: [number, number][];
}

export interface TransferStep {
  fromStation: Station;
  toStation: Station;
  walkMinutes: number;
  instruction: string;
}

export interface WalkLeg {
  fromName: string;
  toName: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  distanceMeters: number;
  distanceKm: number;
  durationMinutes: number;
  polylineCoords: [number, number][];
  instruction: string;
  isWarningLongWalk?: boolean;
}

export interface PlaceTarget {
  name: string;
  coords: [number, number]; // [lat, lng]
  stationId?: string;
}

export interface RoutePlan {
  origin: Station;
  destination: Station;
  segments: RouteSegment[];
  transfer?: TransferStep;
  transfers?: TransferStep[];
  allStops: Station[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalFareIdr: number;
  fareBreakdown?: FareLegBreakdown[];
  polylineCoords: [number, number][];
  originPlaceName?: string;
  destinationPlaceName?: string;
  firstMileWalk?: WalkLeg;
  lastMileWalk?: WalkLeg;
  walkingPolylineCoords?: [number, number][][];
}



/**
 * Pure Indonesian transit fare calculation.
 * Standardized with official fare schedules from `fareRules.ts`.
 */
export function calculateFare(
  type: TransitType,
  distanceKm: number,
  stopCount: number = 1,
  lineId?: LineIdentifier,
  fromStationId?: string,
  toStationId?: string
): number {
  if (lineId === 'kai-bandara') {
    if (fromStationId && toStationId) {
      try {
        return calculateBasoettaFare(fromStationId, toStationId);
      } catch {
        return 70000;
      }
    }
    return 70000;
  }

  if (type === 'tj') {
    return calculateTjFare();
  }

  if (type === 'krl') {
    return calculateKrlFare(distanceKm);
  }

  if (type === 'mrt') {
    // Pergub DKI 34/2019: Rp 3.000 minimum base fare + Rp 1.000 per station traveled, max Rp 14.000
    const stopsTraveled = Math.max(0, stopCount - 1);
    const fare = 3000 + stopsTraveled * 1000;
    return Math.min(14000, Math.max(3000, fare));
  }

  if (type === 'lrt') {
    if (lineId === 'lrt-jakarta' || (!lineId && distanceKm <= 6)) {
      return 5000;
    }
    // LRT Jabodebek (Lin Cibubur & Lin Bekasi): KM 67/2023:
    // Rp 5.000 for first 1 km, + Rp 700 per km thereafter, max Rp 20.000
    if (distanceKm <= 1) {
      return 5000;
    }
    const additionalKm = distanceKm - 1;
    const fare = 5000 + Math.ceil(additionalKm) * 700;
    return Math.min(20000, fare);
  }

  return calculateKrlFare(distanceKm);
}

/**
 * Estimates realistic travel time considering transit vehicle operating speeds and dwell times.
 */
export function calculateTravelTime(
  type: TransitType,
  distanceKm: number,
  stopCount: number
): number {
  if (type === 'krl') {
    // Average operating speed ~42 km/h + 1.5 min per intermediate station
    const runningMins = (distanceKm / 42) * 60;
    const dwellMins = Math.max(0, stopCount - 1) * 1.5;
    return Math.max(3, Math.round(runningMins + dwellMins));
  } else if (type === 'mrt') {
    // MRT Jakarta commercial speed ~60 km/h + 1.0 min per stop
    const runningMins = (distanceKm / 60) * 60;
    const dwellMins = Math.max(0, stopCount - 1) * 1.0;
    return Math.max(2, Math.round(runningMins + dwellMins));
  } else if (type === 'lrt') {
    // LRT operating speed ~45 km/h + 1.0 min per stop
    const runningMins = (distanceKm / 45) * 60;
    const dwellMins = Math.max(0, stopCount - 1) * 1.0;
    return Math.max(2, Math.round(runningMins + dwellMins));
  } else {
    // TransJakarta BRT average speed ~22 km/h + 1.2 min per halte
    const runningMins = (distanceKm / 22) * 60;
    const dwellMins = Math.max(0, stopCount - 1) * 1.2;
    return Math.max(3, Math.round(runningMins + dwellMins));
  }
}

/**
 * Internal helper to extract the ordered sequence of stations along a specific line.
 */
function getLineSubSequence(
  lineId: LineIdentifier,
  fromStationId: string,
  toStationId: string
): Station[] | null {
  const line = TRANSIT_LINES[lineId];
  if (!line) return null;

  const fromIndex = line.stations.indexOf(fromStationId);
  const toIndex = line.stations.indexOf(toStationId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return null;
  }

  const ids =
    fromIndex < toIndex
      ? line.stations.slice(fromIndex, toIndex + 1)
      : line.stations.slice(toIndex, fromIndex + 1).reverse();

  return ids.map((id) => STATION_MAP[id]).filter(Boolean);
}

/**
 * Builds a single RouteSegment from a validated sequence of stations.
 */
function buildSegment(
  lineId: LineIdentifier,
  stations: Station[]
): RouteSegment {
  const line = TRANSIT_LINES[lineId];
  const fromStation = stations[0];
  const toStation = stations[stations.length - 1];

  let totalMeters = 0;
  for (let i = 0; i < stations.length - 1; i++) {
    totalMeters += calculateHaversineDistance(
      stations[i].coords,
      stations[i + 1].coords
    );
  }

  const distanceKm = Math.round((totalMeters / 1000) * 10) / 10;
  const durationMinutes = calculateTravelTime(
    line.type,
    distanceKm,
    stations.length
  );
  const fareIdr = calculateFare(
    line.type,
    distanceKm,
    stations.length,
    lineId,
    fromStation.id,
    toStation.id
  );

  const unit = line.type === 'tj' ? 'halte' : 'stasiun';
  const instruction = `Naik ${line.name} dari ${fromStation.name} menuju ${toStation.name} (${stations.length - 1} ${unit}).`;

  const polylineCoords = getLineTrackSlice(lineId, fromStation.coords, toStation.coords);

  return {
    id: `seg_${lineId}_${fromStation.id}_${toStation.id}`,
    lineId,
    lineName: line.name,
    lineColor: line.color,
    type: line.type,
    fromStation,
    toStation,
    stops: stations,
    stopCount: stations.length,
    distanceKm,
    durationMinutes,
    fareIdr,
    instruction,
    polylineCoords,
  };
}

/**
 * Slices the physical curved railway track or busway roadway coordinates
 * between two stations along a transit line.
 * Automatically handles forward and reverse direction travel.
 */
export function getLineTrackSlice(
  lineId: LineIdentifier,
  fromCoords: [number, number],
  toCoords: [number, number]
): [number, number][] {
  const line = TRANSIT_LINES[lineId];
  const track = line?.trackCoords;
  if (!track || track.length === 0) {
    return [fromCoords, toCoords];
  }

  let idxFrom = 0;
  let distFrom = Infinity;
  let idxTo = 0;
  let distTo = Infinity;

  for (let i = 0; i < track.length; i++) {
    const dFrom = calculateHaversineDistance(track[i], fromCoords);
    if (dFrom < distFrom) {
      distFrom = dFrom;
      idxFrom = i;
    }
    const dTo = calculateHaversineDistance(track[i], toCoords);
    if (dTo < distTo) {
      distTo = dTo;
      idxTo = i;
    }
  }

  const slice =
    idxFrom <= idxTo
      ? track.slice(idxFrom, idxTo + 1)
      : track.slice(idxTo, idxFrom + 1).reverse();

  if (slice.length === 0) {
    return [fromCoords, toCoords];
  }

  const result: [number, number][] = [];
  if (calculateHaversineDistance(fromCoords, slice[0]) > 0.005) {
    result.push(fromCoords);
  }
  result.push(...slice);
  if (calculateHaversineDistance(toCoords, result[result.length - 1]) > 0.005) {
    result.push(toCoords);
  }

  return result;
}

export interface LineTransfer {
  fromStationId: string;
  toStationId: string;
  walkMinutes: number;
  instruction: string;
}

/**
 * Discovers available transfer options between two transit lines,
 * including shared platform stations and physical multi-modal interchange links.
 */
export function getLineTransfers(
  lineAId: LineIdentifier,
  lineBId: LineIdentifier
): LineTransfer[] {
  const lineA = TRANSIT_LINES[lineAId];
  const lineB = TRANSIT_LINES[lineBId];
  if (!lineA || !lineB) return [];

  const results: LineTransfer[] = [];

  // 1. Same platform / shared station (e.g. Manggarai, Duri, Tanah Abang)
  const shared = lineA.stations.filter((id) => lineB.stations.includes(id));
  for (const stId of shared) {
    const st = STATION_MAP[stId];
    if (st) {
      results.push({
        fromStationId: stId,
        toStationId: stId,
        walkMinutes: 5,
        instruction: `Transit di peron ${st.name}: Pindah dari ${lineA.shortName} ke ${lineB.shortName} (estimasi tunggu ~5 mnt).`,
      });
    }
  }

  // 2. Explicit physical interchanges (e.g. Sudirman ⇄ Dukuh Atas, Cikoko ⇄ Cawang, MRT ⇄ TJ)
  for (const conn of INTERCHANGE_CONNECTIONS) {
    if (
      lineA.stations.includes(conn.fromStationId) &&
      lineB.stations.includes(conn.toStationId)
    ) {
      if (
        !results.some(
          (r) =>
            r.fromStationId === conn.fromStationId &&
            r.toStationId === conn.toStationId
        )
      ) {
        results.push({
          fromStationId: conn.fromStationId,
          toStationId: conn.toStationId,
          walkMinutes: conn.walkMinutes,
          instruction: `${conn.description} (${conn.walkMinutes} menit jalan kaki).`,
        });
      }
    }
  }

  return results;
}

/**
 * Pure Route Planning Engine:
 * Evaluates Direct, 1-Transfer, and 2-Transfer routes and selects the best one
 * based on the user's route preference.
 */
export function findTransitRoute(
  originId: string,
  destinationId: string,
  preference: 'FASTEST' | 'CHEAPEST' | 'FEWEST_TRANSFERS' = 'FASTEST'
): RoutePlan | null {
  if (!originId || !destinationId || originId === destinationId) {
    return null;
  }

  const origin = STATION_MAP[originId];
  const destination = STATION_MAP[destinationId];

  if (!origin || !destination) {
    return null;
  }

  interface CandidateRoute {
    segments: RouteSegment[];
    transfers: TransferStep[];
    totalDuration: number;
    totalDistanceKm: number;
    totalFareIdr: number;
    transferCount: number;
  }

  const candidates: CandidateRoute[] = [];

  // -------------------------------------------------------------
  // STRATEGY 1: Direct Route on a Shared Line
  // -------------------------------------------------------------
  const sharedLines = origin.lines.filter((lineId) =>
    destination.lines.includes(lineId)
  );

  for (const lineId of sharedLines) {
    const stops = getLineSubSequence(lineId, originId, destinationId);
    if (stops && stops.length >= 2) {
      const seg = buildSegment(lineId, stops);
      candidates.push({
        segments: [seg],
        transfers: [],
        totalDuration: seg.durationMinutes,
        totalDistanceKm: seg.distanceKm,
        totalFareIdr: seg.fareIdr,
        transferCount: 0,
      });
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 2: 1-Transfer Route
  // -------------------------------------------------------------
  for (const line1Id of origin.lines) {
    for (const line2Id of destination.lines) {
      if (line1Id === line2Id) continue;

      const transfers = getLineTransfers(line1Id, line2Id);
      for (const t of transfers) {
        if (t.fromStationId === originId || t.toStationId === destinationId) continue;

        const leg1Stops = getLineSubSequence(line1Id, originId, t.fromStationId);
        const leg2Stops = getLineSubSequence(line2Id, t.toStationId, destinationId);

        if (leg1Stops && leg2Stops) {
          const seg1 = buildSegment(line1Id, leg1Stops);
          const seg2 = buildSegment(line2Id, leg2Stops);
          const fromSt = STATION_MAP[t.fromStationId];
          const toSt = STATION_MAP[t.toStationId];

          const transfer: TransferStep = {
            fromStation: fromSt,
            toStation: toSt,
            walkMinutes: t.walkMinutes,
            instruction: t.instruction,
          };

          candidates.push({
            segments: [seg1, seg2],
            transfers: [transfer],
            totalDuration: seg1.durationMinutes + t.walkMinutes + seg2.durationMinutes,
            totalDistanceKm: Math.round((seg1.distanceKm + seg2.distanceKm) * 10) / 10,
            totalFareIdr: seg1.fareIdr + seg2.fareIdr,
            transferCount: 1,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 3: 2-Transfer Route
  // -------------------------------------------------------------
  // To avoid performance issues, only check 2-transfers if FEWEST_TRANSFERS is not selected
  // OR if we don't have any 0 or 1 transfer routes.
  if (candidates.length === 0 || preference !== 'FEWEST_TRANSFERS') {
    const allLineIds = Object.keys(TRANSIT_LINES) as LineIdentifier[];
    for (const line1Id of origin.lines) {
      for (const line3Id of destination.lines) {
        if (line1Id === line3Id) continue;
        const line1 = TRANSIT_LINES[line1Id];
        const line3 = TRANSIT_LINES[line3Id];
        if (!line1 || !line3) continue;

        for (const midLineId of allLineIds) {
          if (midLineId === line1Id || midLineId === line3Id) continue;
          const midLine = TRANSIT_LINES[midLineId];
          if (!midLine) continue;

          const transfers1 = getLineTransfers(line1Id, midLineId);
          const transfers2 = getLineTransfers(midLineId, line3Id);
          if (transfers1.length === 0 || transfers2.length === 0) continue;

          for (const t1 of transfers1) {
            for (const t2 of transfers2) {
              if (t1.fromStationId === originId || t2.toStationId === destinationId) continue;
              if (t1.toStationId === t2.fromStationId) continue;

              const leg1Stops = getLineSubSequence(line1Id, originId, t1.fromStationId);
              const leg2Stops = getLineSubSequence(midLineId, t1.toStationId, t2.fromStationId);
              const leg3Stops = getLineSubSequence(line3Id, t2.toStationId, destinationId);

              if (leg1Stops && leg2Stops && leg3Stops) {
                const seg1 = buildSegment(line1Id, leg1Stops);
                const seg2 = buildSegment(midLineId, leg2Stops);
                const seg3 = buildSegment(line3Id, leg3Stops);

                const transfer1: TransferStep = {
                  fromStation: STATION_MAP[t1.fromStationId],
                  toStation: STATION_MAP[t1.toStationId],
                  walkMinutes: t1.walkMinutes,
                  instruction: t1.instruction,
                };
                const transfer2: TransferStep = {
                  fromStation: STATION_MAP[t2.fromStationId],
                  toStation: STATION_MAP[t2.toStationId],
                  walkMinutes: t2.walkMinutes,
                  instruction: t2.instruction,
                };

                candidates.push({
                  segments: [seg1, seg2, seg3],
                  transfers: [transfer1, transfer2],
                  totalDuration: seg1.durationMinutes + t1.walkMinutes + seg2.durationMinutes + t2.walkMinutes + seg3.durationMinutes,
                  totalDistanceKm: Math.round((seg1.distanceKm + seg2.distanceKm + seg3.distanceKm) * 10) / 10,
                  totalFareIdr: seg1.fareIdr + seg2.fareIdr + seg3.fareIdr,
                  transferCount: 2,
                });
              }
            }
          }
        }
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // -------------------------------------------------------------
  // SORT & SELECT BEST CANDIDATE based on Preference
  // -------------------------------------------------------------
  if (preference === 'CHEAPEST') {
    candidates.sort((a, b) => {
      if (a.totalFareIdr !== b.totalFareIdr) return a.totalFareIdr - b.totalFareIdr;
      return a.totalDuration - b.totalDuration; // fallback to fastest
    });
  } else if (preference === 'FEWEST_TRANSFERS') {
    candidates.sort((a, b) => {
      if (a.transferCount !== b.transferCount) return a.transferCount - b.transferCount;
      return a.totalDuration - b.totalDuration; // fallback to fastest
    });
  } else {
    // FASTEST (Default)
    candidates.sort((a, b) => {
      if (a.totalDuration !== b.totalDuration) return a.totalDuration - b.totalDuration;
      return a.transferCount - b.transferCount; // fallback to fewest transfers
    });
  }

  const best = candidates[0];

  const allStops: Station[] = [];
  best.segments.forEach((seg, sIdx) => {
    if (sIdx === 0) {
      allStops.push(...seg.stops);
    } else {
      const lastStopId = allStops[allStops.length - 1]?.id;
      allStops.push(...seg.stops.filter((s) => s.id !== lastStopId));
    }
  });

  const polylineCoords: [number, number][] = [];
  best.segments.forEach((seg, sIdx) => {
    const coords = seg.polylineCoords || seg.stops.map((s) => s.coords);
    polylineCoords.push(...coords);
    if (best.transfers[sIdx]) {
      const t = best.transfers[sIdx];
      if (t.fromStation.id !== t.toStation.id) {
        polylineCoords.push(t.toStation.coords);
      }
    }
  });

  const multiModal = calculateMultiModalFare(
    best.segments.map((s) => ({
      mode: (s.lineId === 'kai-bandara' ? 'basoetta' : s.type) as TransitMode,
      lineId: s.lineId,
      fromStationId: s.fromStation.id,
      toStationId: s.toStation.id,
      distanceKm: s.distanceKm,
      stopCount: s.stopCount,
    }))
  );

  return {
    origin,
    destination,
    segments: best.segments,
    transfer: best.transfers[0],
    transfers: best.transfers,
    allStops,
    totalDistanceKm: best.totalDistanceKm,
    totalDurationMinutes: best.totalDuration,
    totalFareIdr: multiModal.totalFare,
    fareBreakdown: multiModal.breakdown,
    polylineCoords,
  };
}

/**
 * Pure Door-to-Door Journey Planner (POI-to-POI / Station-to-Station / Hybrid):
 * 1. Resolves origin and destination coordinates (or uses assigned transit stations).
 * 2. Finds candidate nearby stations for both endpoints.
 * 3. Evaluates direct and 1-transfer transit options.
 * 4. Augments with first-mile and last-mile walking directions and polyline coordinates.
 */
export async function findDoorToDoorRoute(
  origin: PlaceTarget,
  destination: PlaceTarget,
  preference: 'FASTEST' | 'CHEAPEST' | 'FEWEST_TRANSFERS' = 'FASTEST'
): Promise<RoutePlan | null> {
  if (!origin || !destination) {
    return null;
  }

  // If both have identical stationId
  if (origin.stationId && destination.stationId && origin.stationId === destination.stationId) {
    return null;
  }

  // Identify candidate origin transit stops
  let originCandidates: Station[] = [];
  if (origin.stationId && STATION_MAP[origin.stationId]) {
    originCandidates = [STATION_MAP[origin.stationId]];
  } else {
    originCandidates = [...STATIONS]
      .map((s) => ({ station: s, dist: calculateHaversineDistance(origin.coords, s.coords) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map((x) => x.station);
  }

  // Identify candidate destination transit stops
  let destCandidates: Station[] = [];
  if (destination.stationId && STATION_MAP[destination.stationId]) {
    destCandidates = [STATION_MAP[destination.stationId]];
  } else {
    destCandidates = [...STATIONS]
      .map((s) => ({ station: s, dist: calculateHaversineDistance(destination.coords, s.coords) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map((x) => x.station);
  }

  interface EvaluatedItinerary {
    transitRoute: RoutePlan;
    candOrigin: Station;
    candDest: Station;
    firstMileDist: number;
    lastMileDist: number;
    totalDuration: number;
  }

  let bestItinerary: EvaluatedItinerary | null = null;

  for (const candOrigin of originCandidates) {
    for (const candDest of destCandidates) {
      if (candOrigin.id === candDest.id) continue;

      const transitRoute = findTransitRoute(candOrigin.id, candDest.id, preference);
      if (!transitRoute) continue;

      const firstMileDist = calculateHaversineDistance(origin.coords, candOrigin.coords);
      const firstMileDur = Math.max(1, Math.round((firstMileDist * 1.25) / 75));

      const lastMileDist = calculateHaversineDistance(candDest.coords, destination.coords);
      const lastMileDur = Math.max(1, Math.round((lastMileDist * 1.25) / 75));

      const totalDuration = firstMileDur + transitRoute.totalDurationMinutes + lastMileDur;

      if (!bestItinerary || totalDuration < bestItinerary.totalDuration) {
        bestItinerary = {
          transitRoute,
          candOrigin,
          candDest,
          firstMileDist,
          lastMileDist,
          totalDuration,
        };
      }
    }
  }

  if (!bestItinerary) {
    return null;
  }

  const {
    transitRoute,
    candOrigin,
    candDest,
    firstMileDist,
    lastMileDist,
  } = bestItinerary;

  const walkingPolylines: [number, number][][] = [];

  // Build first mile walk if origin is not already inside the station (< 25m)
  let firstMileWalk: WalkLeg | undefined;
  if (firstMileDist >= 25 || origin.name !== candOrigin.name) {
    const walkRoute = await calculateWalkingRoute(origin.coords, candOrigin.coords, {
      fromName: origin.name,
      toName: candOrigin.name,
    });
    const isWarning = walkRoute.distanceMeters > 1500;
    firstMileWalk = {
      fromName: origin.name,
      toName: candOrigin.name,
      fromCoords: origin.coords,
      toCoords: candOrigin.coords,
      distanceMeters: walkRoute.distanceMeters,
      distanceKm: walkRoute.distanceKm,
      durationMinutes: walkRoute.durationMinutes,
      polylineCoords: walkRoute.polylineCoords,
      instruction: `Jalan kaki dari ${origin.name} ke ${candOrigin.name} (${formatDistance(walkRoute.distanceMeters)}, ~${walkRoute.durationMinutes} mnt).`,
      isWarningLongWalk: isWarning,
    };
    walkingPolylines.push(walkRoute.polylineCoords);
  }

  // Build last mile walk if destination is not already inside the station (< 25m)
  let lastMileWalk: WalkLeg | undefined;
  if (lastMileDist >= 25 || destination.name !== candDest.name) {
    const walkRoute = await calculateWalkingRoute(candDest.coords, destination.coords, {
      fromName: candDest.name,
      toName: destination.name,
    });
    const isWarning = walkRoute.distanceMeters > 1500;
    lastMileWalk = {
      fromName: candDest.name,
      toName: destination.name,
      fromCoords: candDest.coords,
      toCoords: destination.coords,
      distanceMeters: walkRoute.distanceMeters,
      distanceKm: walkRoute.distanceKm,
      durationMinutes: walkRoute.durationMinutes,
      polylineCoords: walkRoute.polylineCoords,
      instruction: `Jalan kaki dari ${candDest.name} ke ${destination.name} (${formatDistance(walkRoute.distanceMeters)}, ~${walkRoute.durationMinutes} mnt).`,
      isWarningLongWalk: isWarning,
    };
    walkingPolylines.push(walkRoute.polylineCoords);
  }

  const walkDistKm =
    (firstMileWalk ? firstMileWalk.distanceKm : 0) +
    (lastMileWalk ? lastMileWalk.distanceKm : 0);
  const walkDurMins =
    (firstMileWalk ? firstMileWalk.durationMinutes : 0) +
    (lastMileWalk ? lastMileWalk.durationMinutes : 0);

  return {
    ...transitRoute,
    originPlaceName: origin.name,
    destinationPlaceName: destination.name,
    firstMileWalk,
    lastMileWalk,
    totalDistanceKm: Math.round((transitRoute.totalDistanceKm + walkDistKm) * 10) / 10,
    totalDurationMinutes: transitRoute.totalDurationMinutes + walkDurMins,
    totalFareIdr: transitRoute.totalFareIdr,
    walkingPolylineCoords: walkingPolylines,
  };
}
