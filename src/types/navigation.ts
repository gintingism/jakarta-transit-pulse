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
  if (!plan) return [];
  const legs: RouteLeg[] = [];
  let legIndex = 0;

  // 1. First-mile walk (if present)
  if (plan.firstMileWalk && plan.firstMileWalk.distanceMeters > 0) {
    const walk = plan.firstMileWalk;
    const fromCoords = walk.fromCoords || [-6.2, 106.8];
    const toCoords = walk.toCoords || [-6.2, 106.8];
    legs.push({
      id: `leg-walk-first-${legIndex++}`,
      type: 'WALK',
      from: {
        id: 'origin_place',
        name: walk.fromName || 'Titik Awal',
        lat: fromCoords[0],
        lng: fromCoords[1],
      },
      to: {
        id: plan.origin?.id || 'origin_station',
        name: walk.toName || plan.origin?.name || 'Stasiun Keberangkatan',
        lat: toCoords[0],
        lng: toCoords[1],
      },
      polylineCoordinates:
        walk.polylineCoords && walk.polylineCoords.length >= 2
          ? walk.polylineCoords
          : [fromCoords, toCoords],
      distanceMeters: walk.distanceMeters || 0,
      durationMinutes: walk.durationMinutes || 0,
      status: 'upcoming',
      instruction:
        walk.instruction ||
        `Jalan kaki ${Math.round(walk.distanceMeters || 0)} meter menuju ${walk.toName || 'stasiun'}`,
    });
  }

  // 2. Transit segments & transfers
  const transfersList = plan.transfers || (plan.transfer ? [plan.transfer] : []);

  if (Array.isArray(plan.segments)) {
    plan.segments.forEach((seg: RouteSegment, sIdx: number) => {
      if (!seg || !seg.fromStation || !seg.toStation) return;

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
        .filter((st) => st && Array.isArray(st.coords) && st.coords.length === 2)
        .map((st) => ({
          id: st.id,
          name: st.name,
          lat: st.coords[0],
          lng: st.coords[1],
        }));

      const fromCoords = seg.fromStation.coords || [-6.2, 106.8];
      const toCoords = seg.toStation.coords || [-6.2, 106.8];

      legs.push({
        id: `leg-transit-${seg.id || sIdx}-${legIndex++}`,
        type: 'TRANSIT',
        mode,
        lineName: seg.lineName,
        lineColor: seg.lineColor,
        from: {
          id: seg.fromStation.id,
          name: seg.fromStation.name,
          lat: fromCoords[0],
          lng: fromCoords[1],
        },
        to: {
          id: seg.toStation.id,
          name: seg.toStation.name,
          lat: toCoords[0],
          lng: toCoords[1],
        },
        intermediateStops,
        polylineCoordinates:
          seg.polylineCoords && seg.polylineCoords.length >= 2
            ? seg.polylineCoords
            : [fromCoords, toCoords],
        distanceMeters: Math.round((seg.distanceKm || 0) * 1000),
        durationMinutes: seg.durationMinutes || 0,
        status: 'upcoming',
        instruction:
          seg.instruction ||
          `Naik ${mode} ${seg.lineName || ''} menuju ${seg.toStation.name}`,
      });

      // Transfer between segments (if exists)
      if (transfersList && transfersList[sIdx]) {
        const transfer: TransferStep = transfersList[sIdx];
        if (transfer && transfer.fromStation && transfer.toStation) {
          const tFromCoords = transfer.fromStation.coords || [-6.2, 106.8];
          const tToCoords = transfer.toStation.coords || [-6.2, 106.8];

          legs.push({
            id: `leg-transfer-${sIdx}-${legIndex++}`,
            type: 'TRANSFER',
            from: {
              id: transfer.fromStation.id,
              name: transfer.fromStation.name,
              lat: tFromCoords[0],
              lng: tFromCoords[1],
            },
            to: {
              id: transfer.toStation.id,
              name: transfer.toStation.name,
              lat: tToCoords[0],
              lng: tToCoords[1],
            },
            polylineCoordinates: [tFromCoords, tToCoords],
            distanceMeters: Math.round((transfer.walkMinutes || 2) * 75),
            durationMinutes: transfer.walkMinutes || 2,
            status: 'upcoming',
            instruction:
              transfer.instruction ||
              `Pindah peron / transfer ke ${transfer.toStation.name}`,
          });
        }
      }
    });
  }

  // 3. Last-mile walk (if present)
  if (plan.lastMileWalk && plan.lastMileWalk.distanceMeters > 0) {
    const walk = plan.lastMileWalk;
    const fromCoords = walk.fromCoords || [-6.2, 106.8];
    const toCoords = walk.toCoords || [-6.2, 106.8];

    legs.push({
      id: `leg-walk-last-${legIndex++}`,
      type: 'WALK',
      from: {
        id: plan.destination?.id || 'dest_station',
        name: walk.fromName || plan.destination?.name || 'Stasiun Kedatangan',
        lat: fromCoords[0],
        lng: fromCoords[1],
      },
      to: {
        id: 'dest_place',
        name: walk.toName || 'Tujuan Akhir',
        lat: toCoords[0],
        lng: toCoords[1],
      },
      polylineCoordinates:
        walk.polylineCoords && walk.polylineCoords.length >= 2
          ? walk.polylineCoords
          : [fromCoords, toCoords],
      distanceMeters: walk.distanceMeters || 0,
      durationMinutes: walk.durationMinutes || 0,
      status: 'upcoming',
      instruction:
        walk.instruction ||
        `Jalan kaki ${Math.round(walk.distanceMeters || 0)} meter menuju ${walk.toName || 'tujuan akhir'}`,
    });
  }

  // Fallback: If no legs were generated but origin and destination are present
  if (legs.length === 0 && plan.origin && plan.destination) {
    const fromCoords = plan.origin.coords || [-6.2, 106.8];
    const toCoords = plan.destination.coords || [-6.2, 106.8];
    legs.push({
      id: `leg-fallback-${legIndex++}`,
      type: 'TRANSIT',
      mode: 'KRL',
      lineName: 'Transit',
      lineColor: '#0284c7',
      from: {
        id: plan.origin.id,
        name: plan.origin.name,
        lat: fromCoords[0],
        lng: fromCoords[1],
      },
      to: {
        id: plan.destination.id,
        name: plan.destination.name,
        lat: toCoords[0],
        lng: toCoords[1],
      },
      polylineCoordinates:
        plan.polylineCoords && plan.polylineCoords.length >= 2
          ? plan.polylineCoords
          : [fromCoords, toCoords],
      distanceMeters: Math.round((plan.totalDistanceKm || 1) * 1000),
      durationMinutes: plan.totalDurationMinutes || 10,
      status: 'upcoming',
      instruction: `Menuju ${plan.destination.name}`,
    });
  }

  // Initialize first leg as active if legs exist
  if (legs.length > 0) {
    legs[0].status = 'active';
  }

  return legs;
}
