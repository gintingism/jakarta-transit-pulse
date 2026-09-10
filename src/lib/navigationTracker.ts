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

// ── Pure Algorithmic Domain Functions ────────────────────────────────────────

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
  type: NavigationLegType
): boolean {
  if (type === 'WALK') {
    return distanceMeters <= 25;
  }
  // TRANSIT & TRANSFER
  return distanceMeters <= 80;
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
  if (!polyline || polyline.length < 2) return false;

  let minDistance = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];

    // Perpendicular distance from userPos to segment [a, b]
    const [lat1, lon1] = a;
    const [lat2, lon2] = b;
    const midLat = (lat1 + lat2) / 2;
    const kx = Math.cos((midLat * Math.PI) / 180) * 111320;
    const ky = 110540;

    const dx = (lon2 - lon1) * kx;
    const dy = (lat2 - lat1) * ky;
    const px = (userPos.lng - lon1) * kx;
    const py = (userPos.lat - lat1) * ky;

    const lenSq = dx * dx + dy * dy;
    let projLat = lat1;
    let projLng = lon1;

    if (lenSq > 0) {
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
      projLat = lat1 + t * (lat2 - lat1);
      projLng = lon1 + t * (lon2 - lon1);
    }

    const dist = calculateHaversineDistance([userPos.lat, userPos.lng], [projLat, projLng]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance > thresholdMeters;
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

/**
 * GPS Drift Filter:
 * Ensures transition triggers ONLY if position is within geofence for >= 2 consecutive ticks
 */
export function processGpsTick(params: ProcessGpsTickParams): ProcessGpsTickResult {
  const { currentLeg, userPos, consecutiveInsideCount } = params;
  const distanceToTarget = calculateDistanceToStop(userPos, currentLeg.to);
  const inside = evaluateGeofence(distanceToTarget, currentLeg.type);

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

// ── Custom React Hook: useNavigationTracker ──────────────────────────────────

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

        // 1. Process GPS geofence tick with 2-tick drift filter
        const tick = processGpsTick({
          currentLeg,
          userPos,
          consecutiveInsideCount: consecutiveCountRef.current,
        });

        consecutiveCountRef.current = tick.newConsecutiveCount;

        // 2. If current leg completed -> advance to next leg
        if (tick.isCompleted) {
          const nextIndex = prev.currentLegIndex + 1;
          const isFinal = nextIndex >= prev.legs.length;

          const updatedLegs = prev.legs.map((leg, idx) => {
            if (idx <= prev.currentLegIndex) return { ...leg, status: 'completed' as const };
            if (idx === nextIndex) return { ...leg, status: 'active' as const };
            return leg;
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
            distanceToNextStopMeters: nextLeg.distanceMeters,
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
          // 4. Check off-route
          const off = isOffRoute(userPos, currentLeg.polylineCoordinates, 100);
          if (off && prev.status !== 'approaching_destination') {
            newStatus = 'off_route';
            onStatusChangeRef.current?.('off_route');
          } else if (newStatus === 'off_route' && !off) {
            newStatus = 'navigating';
            onStatusChangeRef.current?.('navigating');
          }
        }

        return {
          ...prev,
          currentLocation: userPos,
          distanceToNextStopMeters: Math.round(tick.distanceToTarget),
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
