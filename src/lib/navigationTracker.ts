import { useEffect, useState, useRef, useCallback } from 'react';
import {
  StationStop,
  RouteLeg,
  NavigationLegType,
  NavigationStatus,
  NavigationState,
  NavigationPosition,
} from '@/src/types/navigation';
import { calculateHaversineDistance } from '@/src/lib/geoMath';

/**
 * Calculates straight-line distance in meters from coordinates to a StationStop
 */
export function calculateDistanceToStop(
  pos: { lat: number; lng: number },
  target: StationStop
): number {
  return calculateHaversineDistance([pos.lat, pos.lng], [target.lat, target.lng]);
}

/**
 * Evaluates whether a user is within geofence boundary:
 * - WALK: <= 25 meters
 * - TRANSIT / TRANSFER: <= 80 meters
 */
export function evaluateGeofence(
  distanceMeters: number,
  type: NavigationLegType,
  isStation = false
): boolean {
  if (type === 'WALK') {
    return distanceMeters <= (isStation ? 75 : 40);
  }
  // TRANSIT & TRANSFER
  return distanceMeters <= 80;
}

export function isStationTarget(stop?: StationStop | null): boolean {
  if (!stop || !stop.id) return false;
  const id = stop.id.toLowerCase();
  return (
    id.startsWith('krl_') ||
    id.startsWith('tj_') ||
    id.startsWith('mrt_') ||
    id.startsWith('lrt_') ||
    id.startsWith('bandara_') ||
    id.startsWith('st_')
  );
}

export interface PolylineProjection {
  distanceMeters: number;
  projectedPoint: [number, number];
  segmentIndex: number;
  fraction: number;
}

export function projectPointToPolyline(
  point: { lat: number; lng: number },
  polyline: [number, number][]
): PolylineProjection | null {
  if (!polyline || polyline.length === 0) return null;

  if (polyline.length === 1) {
    const single = polyline[0];
    return {
      distanceMeters: calculateHaversineDistance([point.lat, point.lng], single),
      projectedPoint: single,
      segmentIndex: 0,
      fraction: 0,
    };
  }

  let minDistance = Infinity;
  let bestSegmentIndex = 0;
  let bestFraction = 0;
  let bestProj: [number, number] = polyline[0];

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const [lat1, lon1] = a;
    const [lat2, lon2] = b;

    const midLat = (lat1 + lat2) / 2;
    const kx = Math.cos((midLat * Math.PI) / 180) * 111320;
    const ky = 110540;

    const dx = (lon2 - lon1) * kx;
    const dy = (lat2 - lat1) * ky;
    const px = (point.lng - lon1) * kx;
    const py = (point.lat - lat1) * ky;

    const lenSq = dx * dx + dy * dy;
    let t = 0;
    let projLat = lat1;
    let projLng = lon1;

    if (lenSq > 0) {
      t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
      projLat = lat1 + t * (lat2 - lat1);
      projLng = lon1 + t * (lon2 - lon1);
    }

    const dist = calculateHaversineDistance([point.lat, point.lng], [projLat, projLng]);
    if (dist < minDistance) {
      minDistance = dist;
      bestSegmentIndex = i;
      bestFraction = t;
      bestProj = [projLat, projLng];
    }
  }

  return {
    distanceMeters: minDistance,
    projectedPoint: bestProj,
    segmentIndex: bestSegmentIndex,
    fraction: bestFraction,
  };
}

/**
 * Detects whether commuter is arriving at H-1 station before destination
 */
export function checkApproachingDestination(
  currentLeg: RouteLeg,
  userPos: { lat: number; lng: number }
): { isApproaching: boolean; nextStationName?: string } {
  if (currentLeg.type !== 'TRANSIT') {
    return { isApproaching: false };
  }

  // If there are intermediate stops, the last intermediate stop is H-1 before final stop
  if (currentLeg.intermediateStops && currentLeg.intermediateStops.length > 0) {
    const hMinusOneStop = currentLeg.intermediateStops[currentLeg.intermediateStops.length - 1];
    const distToHMinusOne = calculateDistanceToStop(userPos, hMinusOneStop);
    if (distToHMinusOne <= 80) {
      return {
        isApproaching: true,
        nextStationName: currentLeg.to.name,
      };
    }
  }

  return { isApproaching: false };
}

/**
 * Checks if a point is off-route (> threshold meters from polyline path)
 */
export function isOffRoute(
  userPos: { lat: number; lng: number },
  polyline: [number, number][],
  thresholdMeters = 100
): boolean {
  const proj = projectPointToPolyline(userPos, polyline);
  if (!proj) return false;
  return proj.distanceMeters > thresholdMeters;
}

export interface AdaptiveStepResult {
  nextLegIndex: number;
  isCompleted: boolean;
  distanceToActiveTarget: number;
  newConsecutiveCount: number;
  isAdvancedByLookahead: boolean;
}

export function evaluateAdaptiveStep(params: {
  legs: RouteLeg[];
  currentLegIndex: number;
  userPos: { lat: number; lng: number };
  consecutiveInsideCount: number;
}): AdaptiveStepResult {
  const { legs, currentLegIndex, userPos, consecutiveInsideCount } = params;

  if (currentLegIndex >= legs.length) {
    return {
      nextLegIndex: Math.max(0, legs.length - 1),
      isCompleted: true,
      distanceToActiveTarget: 0,
      newConsecutiveCount: 0,
      isAdvancedByLookahead: false,
    };
  }

  const currentLeg = legs[currentLegIndex];
  const currentIsStation = isStationTarget(currentLeg.to);
  const distToCurrentTarget = calculateDistanceToStop(userPos, currentLeg.to);
  const insideCurrentTarget = evaluateGeofence(distToCurrentTarget, currentLeg.type, currentIsStation);

  // 1. Lookahead check for future steps (k > currentLegIndex)
  for (let k = legs.length - 1; k > currentLegIndex; k--) {
    const futureLeg = legs[k];
    const futureIsStation = isStationTarget(futureLeg.to);
    const distToFutureTarget = calculateDistanceToStop(userPos, futureLeg.to);
    const insideFutureTarget = evaluateGeofence(distToFutureTarget, futureLeg.type, futureIsStation);

    // User reached destination of future leg k:
    if (insideFutureTarget) {
      const jumpIndex = Math.min(k + 1, legs.length - 1);
      const activeLeg = legs[jumpIndex];
      const remainingDist = calculateDistanceToStop(userPos, activeLeg.to);
      return {
        nextLegIndex: jumpIndex,
        isCompleted: jumpIndex >= legs.length - 1 && insideFutureTarget,
        distanceToActiveTarget: remainingDist,
        newConsecutiveCount: 0,
        isAdvancedByLookahead: true,
      };
    }

    // User is on the polyline of future leg k:
    if (futureLeg.polylineCoordinates && futureLeg.polylineCoordinates.length >= 2) {
      const projFuture = projectPointToPolyline(userPos, futureLeg.polylineCoordinates);
      if (projFuture && projFuture.distanceMeters <= 80) {
        const projCurrent = projectPointToPolyline(userPos, currentLeg.polylineCoordinates);
        const distToCurrentPolyline = projCurrent ? projCurrent.distanceMeters : Infinity;

        // Commuter is clearly closer to future leg than current leg or far from current target
        if (projFuture.distanceMeters < distToCurrentPolyline || distToCurrentTarget > 200) {
          const remainingDist = calculateDistanceToStop(userPos, futureLeg.to);
          return {
            nextLegIndex: k,
            isCompleted: false,
            distanceToActiveTarget: remainingDist,
            newConsecutiveCount: 0,
            isAdvancedByLookahead: true,
          };
        }
      }
    }
  }

  // 2. Standard step progression with 2-tick drift filter
  if (insideCurrentTarget) {
    const newCount = consecutiveInsideCount + 1;
    if (newCount >= 2) {
      const nextIndex = currentLegIndex + 1;
      const isFinal = nextIndex >= legs.length;
      const targetIndex = isFinal ? legs.length - 1 : nextIndex;
      const nextTargetLeg = legs[targetIndex];
      const remainingDist = isFinal ? 0 : calculateDistanceToStop(userPos, nextTargetLeg.to);

      return {
        nextLegIndex: targetIndex,
        isCompleted: true,
        distanceToActiveTarget: remainingDist,
        newConsecutiveCount: 0,
        isAdvancedByLookahead: false,
      };
    }

    return {
      nextLegIndex: currentLegIndex,
      isCompleted: false,
      distanceToActiveTarget: distToCurrentTarget,
      newConsecutiveCount: newCount,
      isAdvancedByLookahead: false,
    };
  }

  return {
    nextLegIndex: currentLegIndex,
    isCompleted: false,
    distanceToActiveTarget: distToCurrentTarget,
    newConsecutiveCount: 0,
    isAdvancedByLookahead: false,
  };
}

export function evaluateOffRoute(params: {
  legs: RouteLeg[];
  activeLegIndex: number;
  userPos: { lat: number; lng: number };
  consecutiveOffRouteCount: number;
  toleranceMeters?: number;
  requiredTicks?: number;
}): {
  isOffRoute: boolean;
  newConsecutiveOffRouteCount: number;
  minDistanceToRoute: number;
} {
  const {
    legs,
    activeLegIndex,
    userPos,
    consecutiveOffRouteCount,
    toleranceMeters = 100,
    requiredTicks = 3,
  } = params;

  if (!legs || legs.length === 0 || activeLegIndex >= legs.length) {
    return {
      isOffRoute: false,
      newConsecutiveOffRouteCount: 0,
      minDistanceToRoute: 0,
    };
  }

  let minDistanceToRoute = Infinity;

  // Check against all remaining legs
  for (let i = activeLegIndex; i < legs.length; i++) {
    const leg = legs[i];

    if (leg.polylineCoordinates && leg.polylineCoordinates.length > 0) {
      const proj = projectPointToPolyline(userPos, leg.polylineCoordinates);
      if (proj && proj.distanceMeters < minDistanceToRoute) {
        minDistanceToRoute = proj.distanceMeters;
      }
    }

    const distFrom = calculateDistanceToStop(userPos, leg.from);
    if (distFrom < minDistanceToRoute) {
      minDistanceToRoute = distFrom;
    }

    const distTo = calculateDistanceToStop(userPos, leg.to);
    if (distTo < minDistanceToRoute) {
      minDistanceToRoute = distTo;
    }
  }

  if (minDistanceToRoute > toleranceMeters) {
    const newCount = consecutiveOffRouteCount + 1;
    return {
      isOffRoute: newCount >= requiredTicks,
      newConsecutiveOffRouteCount: newCount,
      minDistanceToRoute,
    };
  }

  return {
    isOffRoute: false,
    newConsecutiveOffRouteCount: 0,
    minDistanceToRoute,
  };
}

export interface ProcessGpsTickParams {
  currentLeg: RouteLeg;
  userPos: { lat: number; lng: number };
  consecutiveInsideCount: number;
}

export interface ProcessGpsTickResult {
  isCompleted: boolean;
  newConsecutiveCount: number;
  distanceToTarget: number;
}

export function processGpsTick(params: ProcessGpsTickParams): ProcessGpsTickResult {
  const { currentLeg, userPos, consecutiveInsideCount } = params;
  const distanceToTarget = calculateDistanceToStop(userPos, currentLeg.to);
  const inside = evaluateGeofence(distanceToTarget, currentLeg.type, isStationTarget(currentLeg.to));

  if (inside) {
    const newCount = consecutiveInsideCount + 1;
    return {
      isCompleted: newCount >= 2,
      newConsecutiveCount: newCount,
      distanceToTarget,
    };
  }

  return {
    isCompleted: false,
    newConsecutiveCount: 0,
    distanceToTarget,
  };
}

export interface UseNavigationTrackerOptions {
  enabled?: boolean;
  onLegChange?: (index: number, leg: RouteLeg) => void;
  onStatusChange?: (status: NavigationStatus) => void;
  onInstruction?: (instruction: string) => void;
}

export function useNavigationTracker(
  legs: RouteLeg[],
  options: UseNavigationTrackerOptions = {}
) {
  const { enabled = true, onLegChange, onStatusChange, onInstruction } = options;

  const [navigationState, setNavigationState] = useState<NavigationState>(() => ({
    isActive: enabled && legs.length > 0,
    currentLegIndex: 0,
    legs: legs.map((l, i) => ({ ...l, status: i === 0 ? 'active' : 'upcoming' })),
    currentLocation: null,
    distanceToNextStopMeters: legs.length > 0 ? legs[0].distanceMeters : 0,
    status: enabled && legs.length > 0 ? 'navigating' : 'idle',
    offRoute: false,
    lastInstruction: legs.length > 0 ? legs[0].instruction : '',
    isSpeaking: false,
    isMuted: false,
    isCentered: true,
  }));

  const consecutiveCountRef = useRef<number>(0);
  const consecutiveOffRouteRef = useRef<number>(0);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastProcessedPosRef = useRef<{ lat: number; lng: number } | null>(null);

  // Keep latest callbacks and legs in refs to avoid re-subscribing the GPS watcher
  const onLegChangeRef = useRef(onLegChange);
  onLegChangeRef.current = onLegChange;

  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const onInstructionRef = useRef(onInstruction);
  onInstructionRef.current = onInstruction;

  const legsRef = useRef(legs);
  legsRef.current = legs;

  // Sync incoming legs
  useEffect(() => {
    if (legs.length > 0) {
      setNavigationState((prev) => ({
        ...prev,
        legs: legs.map((l, i) => ({
          ...l,
          status: i < prev.currentLegIndex ? 'completed' : i === prev.currentLegIndex ? 'active' : 'upcoming',
        })),
        lastInstruction: legs[prev.currentLegIndex]?.instruction || '',
      }));
    }
  }, [legs]);

  // Screen Wake Lock API management
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    let isMounted = true;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          const nav = navigator as unknown as {
            wakeLock: {
              request: (type: string) => Promise<{ release: () => Promise<void> }>;
            };
          };
          const lock = await nav.wakeLock.request('screen');
          if (isMounted) {
            wakeLockRef.current = lock;
          } else {
            void lock.release();
          }
        }
      } catch {
        // Wake lock may fail due to low battery or browser permissions
        wakeLockRef.current = null;
      }
    };

    void requestWakeLock();

    return () => {
      isMounted = false;
      if (wakeLockRef.current) {
        try {
          void wakeLockRef.current.release();
        } catch {}
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);

  // Geolocation watchPosition lifecycle (pure GPS tracking, stable watcher)
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled || legsRef.current.length === 0) {
      return;
    }

    if (!('geolocation' in navigator)) {
      setNavigationState((prev) => ({ ...prev, status: 'gps_lost' }));
      onStatusChangeRef.current?.('gps_lost');
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const userPos: NavigationPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        accuracy: position.coords.accuracy,
      };

      // Filter micro-movements / GPS jitter (< 0.00001 deg, ~1.1 meters) to prevent render loops
      const last = lastProcessedPosRef.current;
      if (
        last &&
        Math.abs(last.lat - userPos.lat) < 0.00001 &&
        Math.abs(last.lng - userPos.lng) < 0.00001
      ) {
        return;
      }
      lastProcessedPosRef.current = { lat: userPos.lat, lng: userPos.lng };

      setNavigationState((prev) => {
        const currentLeg = prev.legs[prev.currentLegIndex];
        if (!currentLeg) {
          return {
            ...prev,
            currentLocation: userPos,
            status: 'arrived',
          };
        }

        // 1. Evaluate adaptive step progression (including lookahead)
        const stepResult = evaluateAdaptiveStep({
          legs: prev.legs,
          currentLegIndex: prev.currentLegIndex,
          userPos,
          consecutiveInsideCount: consecutiveCountRef.current,
        });

        consecutiveCountRef.current = stepResult.newConsecutiveCount;

        // 2. Advance to next leg if completed or advanced via lookahead
        if (stepResult.nextLegIndex > prev.currentLegIndex || stepResult.isCompleted) {
          const nextIndex = stepResult.nextLegIndex;
          const isFinal = nextIndex >= prev.legs.length - 1 && stepResult.isCompleted;

          const updatedLegs: RouteLeg[] = prev.legs.map((leg, idx) => {
            if (idx < nextIndex) return { ...leg, status: 'completed' as const };
            if (idx === nextIndex) return { ...leg, status: isFinal ? ('completed' as const) : ('active' as const) };
            return { ...leg, status: 'upcoming' as const };
          });

          if (isFinal) {
            onStatusChangeRef.current?.('arrived');
            return {
              ...prev,
              currentLocation: userPos,
              legs: updatedLegs,
              status: 'arrived',
              distanceToNextStopMeters: 0,
              lastInstruction: 'Kamu telah sampai di tujuan. Navigasi selesai.',
            };
          }

          const nextLeg = updatedLegs[nextIndex];
          onLegChangeRef.current?.(nextIndex, nextLeg);
          onInstructionRef.current?.(nextLeg.instruction);

          return {
            ...prev,
            currentLocation: userPos,
            currentLegIndex: nextIndex,
            legs: updatedLegs,
            distanceToNextStopMeters: Math.round(stepResult.distanceToActiveTarget),
            lastInstruction: nextLeg.instruction,
          };
        }

        // 3. Check Anti-Bablas approaching destination warning (H-1 intermediate station)
        const approachingCheck = checkApproachingDestination(currentLeg, userPos);
        let newStatus: NavigationStatus = prev.status;

        if (approachingCheck.isApproaching) {
          newStatus = 'approaching_destination';
          onStatusChangeRef.current?.('approaching_destination');
        } else {
          // 4. Snap-to-route off-route evaluation with 3-tick persistence filter
          const offRouteResult = evaluateOffRoute({
            legs: prev.legs,
            activeLegIndex: prev.currentLegIndex,
            userPos,
            consecutiveOffRouteCount: consecutiveOffRouteRef.current,
            toleranceMeters: 100,
            requiredTicks: 3,
          });

          consecutiveOffRouteRef.current = offRouteResult.newConsecutiveOffRouteCount;

          if (offRouteResult.isOffRoute && prev.status !== 'approaching_destination') {
            newStatus = 'off_route';
            onStatusChangeRef.current?.('off_route');
          } else if (newStatus === 'off_route' && !offRouteResult.isOffRoute) {
            newStatus = 'navigating';
            onStatusChangeRef.current?.('navigating');
          }
        }

        return {
          ...prev,
          currentLocation: userPos,
          distanceToNextStopMeters: Math.round(stepResult.distanceToActiveTarget),
          status: newStatus,
          offRoute: newStatus === 'off_route',
        };
      });
    };

    const handleError = () => {
      setNavigationState((prev) => ({ ...prev, status: 'gps_lost' }));
      onStatusChangeRef.current?.('gps_lost');
    };

    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 5000,
    });

    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled]);

  const toggleMute = useCallback(() => {
    setNavigationState((prev) => {
      const nextMuted = !prev.isMuted;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('jtp_voice_muted', nextMuted ? 'true' : 'false');
        } catch {
          // Ignore localStorage restrictions
        }
      }
      return { ...prev, isMuted: nextMuted };
    });
  }, []);

  const toggleCenter = useCallback(() => {
    setNavigationState((prev) => ({ ...prev, isCentered: !prev.isCentered }));
  }, []);

  return {
    state: navigationState,
    toggleMute,
    toggleCenter,
  };
}
