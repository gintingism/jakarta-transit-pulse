import {
  RouteLeg,
  NavigationLegType,
  NavigationTransitMode,
} from '@/src/types/navigation';
import { calculateHaversineDistance } from '@/src/lib/geoMath';
import { projectPointToPolyline } from '@/src/lib/navigationTracker';

export type StationProgressStatus = 'passed' | 'current' | 'upcoming';

export interface StationProgressItem {
  id: string;
  name: string;
  coords: [number, number];
  legIndex: number;
  legType: NavigationLegType;
  mode?: NavigationTransitMode;
  lineName?: string;
  lineColor?: string;
  isOrigin: boolean;
  isDestination: boolean;
  isTransfer: boolean;
  transferToLineName?: string;
  status: StationProgressStatus;
  distanceToUserMeters: number | null;
  orderIndex: number;
}

export interface RouteStationProgress {
  items: StationProgressItem[];
  totalStations: number;
  passedCount: number;
  remainingCount: number;
  currentStation: StationProgressItem | null;
  nextStation: StationProgressItem | null;
  progressPercent: number;
}

/**
 * Extracts a normalized, ordered sequence of stations from RouteLeg[].
 * Deduplicates adjacent transfer stations while preserving transfer metadata.
 */
export function extractRouteStations(legs: RouteLeg[]): StationProgressItem[] {
  if (!legs || legs.length === 0) return [];

  const rawStations: Omit<StationProgressItem, 'orderIndex' | 'status' | 'distanceToUserMeters' | 'isOrigin' | 'isDestination'>[] = [];

  legs.forEach((leg, lIdx) => {
    if (leg.type === 'TRANSIT') {
      // 1. From station
      rawStations.push({
        id: leg.from.id,
        name: leg.from.name,
        coords: [leg.from.lat, leg.from.lng],
        legIndex: lIdx,
        legType: leg.type,
        mode: leg.mode,
        lineName: leg.lineName,
        lineColor: leg.lineColor,
        isTransfer: false,
      });

      // 2. Intermediate stops
      if (Array.isArray(leg.intermediateStops)) {
        leg.intermediateStops.forEach((stop) => {
          rawStations.push({
            id: stop.id,
            name: stop.name,
            coords: [stop.lat, stop.lng],
            legIndex: lIdx,
            legType: leg.type,
            mode: leg.mode,
            lineName: leg.lineName,
            lineColor: leg.lineColor,
            isTransfer: false,
          });
        });
      }

      // 3. To station
      rawStations.push({
        id: leg.to.id,
        name: leg.to.name,
        coords: [leg.to.lat, leg.to.lng],
        legIndex: lIdx,
        legType: leg.type,
        mode: leg.mode,
        lineName: leg.lineName,
        lineColor: leg.lineColor,
        isTransfer: false,
      });
    } else if (leg.type === 'TRANSFER') {
      // Transfer leg: mark interchange on the destination station
      rawStations.push({
        id: leg.to.id,
        name: leg.to.name,
        coords: [leg.to.lat, leg.to.lng],
        legIndex: lIdx,
        legType: leg.type,
        mode: leg.mode,
        lineName: leg.lineName,
        lineColor: leg.lineColor,
        isTransfer: true,
        transferToLineName: legs[lIdx + 1]?.lineName,
      });
    } else if (leg.type === 'WALK') {
      // If walk is connecting to a station, include the destination station if not yet present
      if (leg.to && leg.to.id && !leg.to.id.startsWith('origin_') && !leg.to.id.startsWith('dest_')) {
        rawStations.push({
          id: leg.to.id,
          name: leg.to.name,
          coords: [leg.to.lat, leg.to.lng],
          legIndex: lIdx,
          legType: leg.type,
          mode: leg.mode,
          lineName: leg.lineName,
          lineColor: leg.lineColor,
          isTransfer: false,
        });
      }
    }
  });

  // Deduplicate consecutive identical stations (e.g. at transfer junctions)
  const deduplicated: StationProgressItem[] = [];
  rawStations.forEach((st) => {
    const prev = deduplicated[deduplicated.length - 1];
    if (prev && (prev.id === st.id || prev.name.toLowerCase() === st.name.toLowerCase())) {
      // If the subsequent station is TRANSIT, adopt the TRANSIT legIndex and metadata
      if (st.legType === 'TRANSIT') {
        prev.legIndex = st.legIndex;
        prev.legType = st.legType;
        prev.mode = st.mode;
        prev.lineName = st.lineName;
        prev.lineColor = st.lineColor;
      }
      // Merge transfer info if this is a transfer
      if (st.isTransfer) {
        prev.isTransfer = true;
        prev.transferToLineName = st.transferToLineName;
      }
      // If the new one has line info (next leg), update it
      if (st.lineName && !prev.lineName) {
        prev.lineName = st.lineName;
        prev.lineColor = st.lineColor;
      }
    } else {
      deduplicated.push({
        ...st,
        isOrigin: false,
        isDestination: false,
        status: 'upcoming',
        distanceToUserMeters: null,
        orderIndex: deduplicated.length,
      });
    }
  });

  if (deduplicated.length > 0) {
    deduplicated[0].isOrigin = true;
    deduplicated[deduplicated.length - 1].isDestination = true;
  }

  // Re-assign sequential orderIndex
  return deduplicated.map((st, idx) => ({
    ...st,
    orderIndex: idx,
  }));
}

export interface ComputeStationProgressParams {
  legs: RouteLeg[];
  currentLegIndex: number;
  userPos: { lat: number; lng: number } | null;
}

/**
 * Computes live station progress across the journey.
 * Categorizes each station as 'passed', 'current', or 'upcoming'.
 */
export function computeStationProgress(
  params: ComputeStationProgressParams
): RouteStationProgress {
  const { legs, currentLegIndex, userPos } = params;
  const items = extractRouteStations(legs);

  if (items.length === 0) {
    return {
      items: [],
      totalStations: 0,
      passedCount: 0,
      remainingCount: 0,
      currentStation: null,
      nextStation: null,
      progressPercent: 0,
    };
  }

  const activeLeg = legs[currentLegIndex];

  // Calculate distance from user to each station
  if (userPos) {
    items.forEach((item) => {
      item.distanceToUserMeters = Math.round(
        calculateHaversineDistance([userPos.lat, userPos.lng], item.coords)
      );
    });
  }

  // Determine station statuses
  // 1. Stations in completed legs (legIndex < currentLegIndex) are passed
  // 2. Stations in upcoming legs (legIndex > currentLegIndex) are upcoming
  // 3. Stations in current leg (legIndex === currentLegIndex) are evaluated based on GPS position
  const activeStations = items.filter((st) => st.legIndex === currentLegIndex);

  let activeStationIndexInAll = -1;

  if (activeStations.length > 0) {
    if (!userPos || !activeLeg || !activeLeg.polylineCoordinates || activeLeg.polylineCoordinates.length < 2) {
      // Default: first station of the active leg is current
      activeStationIndexInAll = activeStations[0].orderIndex;
    } else {
      // Check if user is physically inside geofence (<= 80m) of any active station
      const insideStation = activeStations.find(
        (st) => st.distanceToUserMeters !== null && st.distanceToUserMeters <= 80
      );

      if (insideStation) {
        activeStationIndexInAll = insideStation.orderIndex;
      } else {
        // User is traveling in transit between stations.
        // Project user position onto active leg polyline to find the forward-facing station.
        const proj = projectPointToPolyline(userPos, activeLeg.polylineCoordinates);

        if (proj) {
          // Find the station whose cumulative distance along the active leg is just ahead of the user
          // Or find the closest upcoming station in the active segment
          let closestAheadIndex = activeStations[activeStations.length - 1].orderIndex;
          let minDistance = Infinity;

          for (const st of activeStations) {
            const dist = st.distanceToUserMeters ?? Infinity;
            if (dist < minDistance) {
              minDistance = dist;
              closestAheadIndex = st.orderIndex;
            }
          }
          activeStationIndexInAll = closestAheadIndex;
        } else {
          activeStationIndexInAll = activeStations[0].orderIndex;
        }
      }
    }
  } else {
    // If active leg has no direct stations (e.g. walk), find the closest or next station
    const nextLegStation = items.find((st) => st.legIndex > currentLegIndex);
    if (nextLegStation) {
      activeStationIndexInAll = nextLegStation.orderIndex;
    } else {
      activeStationIndexInAll = items.length - 1;
    }
  }

  // Apply statuses based on activeStationIndexInAll
  items.forEach((item) => {
    if (item.orderIndex < activeStationIndexInAll) {
      item.status = 'passed';
    } else if (item.orderIndex === activeStationIndexInAll) {
      item.status = 'current';
    } else {
      item.status = 'upcoming';
    }
  });

  const passedCount = items.filter((st) => st.status === 'passed').length;
  const remainingCount = items.filter((st) => st.status === 'upcoming').length;
  const currentStation = items.find((st) => st.status === 'current') || items[0] || null;
  const nextStation = items.find((st) => st.status === 'upcoming') || null;

  const totalStations = items.length;
  const progressPercent =
    totalStations <= 1
      ? 100
      : Math.min(100, Math.round((passedCount / (totalStations - 1)) * 100));

  return {
    items,
    totalStations,
    passedCount,
    remainingCount,
    currentStation,
    nextStation,
    progressPercent,
  };
}
