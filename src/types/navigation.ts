import { RoutePlan, RouteSegment, TransferStep, WalkLeg } from '@/src/lib/transitEngine';

export interface StationStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type NavigationLegType = 'WALK' | 'TRANSIT' | 'TRANSFER';
export type NavigationTransitMode = 'KRL' | 'TJ' | 'MRT' | 'LRT' | 'BASOETTA';
export type NavigationLegStatus = 'upcoming' | 'active' | 'completed';

export interface RouteLeg {
  id: string;
  type: NavigationLegType;
  mode?: NavigationTransitMode;
  from: StationStop;
  to: StationStop;
  intermediateStops?: StationStop[];
  polylineCoordinates: [number, number][];
  distanceMeters: number;
  durationMinutes: number;
  status: NavigationLegStatus;
  instruction: string;
  lineName?: string;
  lineColor?: string;
}

export type NavigationStatus =
  | 'idle'
  | 'navigating'
  | 'approaching_destination'
  | 'arrived'
  | 'off_route'
  | 'gps_lost';

export interface NavigationPosition {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
}

export interface NavigationState {
  isActive: boolean;
  currentLegIndex: number;
  legs: RouteLeg[];
  currentLocation: NavigationPosition | null;
  distanceToNextStopMeters: number;
  status: NavigationStatus;
  offRoute: boolean;
  lastInstruction: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isCentered: boolean;
}

/**
 * Pure mapping helper: converts RoutePlan into structured RouteLeg[]
 */
export function convertRoutePlanToLegs(plan: RoutePlan): RouteLeg[] {
  const legs: RouteLeg[] = [];
  let legIndex = 0;

  // 1. First-mile walk (if present)
  if (plan.firstMileWalk && plan.firstMileWalk.distanceMeters > 0) {
    const walk = plan.firstMileWalk;
    legs.push({
      id: `leg-walk-first-${legIndex++}`,
      type: 'WALK',
      from: {
        id: 'origin_place',
        name: walk.fromName,
        lat: walk.fromCoords[0],
        lng: walk.fromCoords[1],
      },
      to: {
        id: plan.origin.id,
        name: walk.toName,
        lat: walk.toCoords[0],
        lng: walk.toCoords[1],
      },
      polylineCoordinates: walk.polylineCoords.length > 0 ? walk.polylineCoords : [walk.fromCoords, walk.toCoords],
      distanceMeters: walk.distanceMeters,
      durationMinutes: walk.durationMinutes,
      status: 'upcoming',
      instruction: walk.instruction || `Jalan kaki ${Math.round(walk.distanceMeters)} meter menuju ${walk.toName}`,
    });
  }

  // 2. Transit segments & transfers
  plan.segments.forEach((seg: RouteSegment, sIdx: number) => {
    // Mode conversion
    let mode: NavigationTransitMode = 'KRL';
    if (seg.lineId === 'kai-bandara') {
      mode = 'BASOETTA';
    } else if (seg.type === 'tj') {
      mode = 'TJ';
    } else if (seg.type === 'mrt') {
      mode = 'MRT';
    } else if (seg.type === 'lrt') {
      mode = 'LRT';
    } else {
      mode = 'KRL';
    }

    const intermediateStops: StationStop[] = (seg.stops || [])
      .slice(1, -1)
      .map((st) => ({
        id: st.id,
        name: st.name,
        lat: st.coords[0],
        lng: st.coords[1],
      }));

    legs.push({
      id: `leg-transit-${seg.id || sIdx}-${legIndex++}`,
      type: 'TRANSIT',
      mode,
      lineName: seg.lineName,
      lineColor: seg.lineColor,
      from: {
        id: seg.fromStation.id,
        name: seg.fromStation.name,
        lat: seg.fromStation.coords[0],
        lng: seg.fromStation.coords[1],
      },
      to: {
        id: seg.toStation.id,
        name: seg.toStation.name,
        lat: seg.toStation.coords[0],
        lng: seg.toStation.coords[1],
      },
      intermediateStops,
      polylineCoordinates: seg.polylineCoords || [seg.fromStation.coords, seg.toStation.coords],
      distanceMeters: Math.round(seg.distanceKm * 1000),
      durationMinutes: seg.durationMinutes,
      status: 'upcoming',
      instruction: seg.instruction || `Naik ${mode} ${seg.lineName} menuju ${seg.toStation.name}`,
    });

    // Transfer between segments (if exists)
    if (plan.transfers && plan.transfers[sIdx]) {
      const transfer: TransferStep = plan.transfers[sIdx];
      legs.push({
        id: `leg-transfer-${sIdx}-${legIndex++}`,
        type: 'TRANSFER',
        from: {
          id: transfer.fromStation.id,
          name: transfer.fromStation.name,
          lat: transfer.fromStation.coords[0],
          lng: transfer.fromStation.coords[1],
        },
        to: {
          id: transfer.toStation.id,
          name: transfer.toStation.name,
          lat: transfer.toStation.coords[0],
          lng: transfer.toStation.coords[1],
        },
        polylineCoordinates: [transfer.fromStation.coords, transfer.toStation.coords],
        distanceMeters: Math.round(transfer.walkMinutes * 75),
        durationMinutes: transfer.walkMinutes,
        status: 'upcoming',
        instruction: transfer.instruction || `Pindah peron / transfer ke ${transfer.toStation.name}`,
      });
    }
  });

  // 3. Last-mile walk (if present)
  if (plan.lastMileWalk && plan.lastMileWalk.distanceMeters > 0) {
    const walk = plan.lastMileWalk;
    legs.push({
      id: `leg-walk-last-${legIndex++}`,
      type: 'WALK',
      from: {
        id: plan.destination.id,
        name: walk.fromName,
        lat: walk.fromCoords[0],
        lng: walk.fromCoords[1],
      },
      to: {
        id: 'dest_place',
        name: walk.toName,
        lat: walk.toCoords[0],
        lng: walk.toCoords[1],
      },
      polylineCoordinates: walk.polylineCoords.length > 0 ? walk.polylineCoords : [walk.fromCoords, walk.toCoords],
      distanceMeters: walk.distanceMeters,
      durationMinutes: walk.durationMinutes,
      status: 'upcoming',
      instruction: walk.instruction || `Jalan kaki ${Math.round(walk.distanceMeters)} meter menuju ${walk.toName}`,
    });
  }

  // Initialize first leg as active if legs exist
  if (legs.length > 0) {
    legs[0].status = 'active';
  }

  return legs;
}
