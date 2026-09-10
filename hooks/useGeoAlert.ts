'use client';

import { useEffect, useRef } from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import { STATION_MAP } from '@/src/data/transitNetwork';
import { playDisembarkAlarmChime } from '@/lib/audio';
import { sendDisembarkNotification, requestNotificationPermission } from '@/lib/notifications';

/**
 * Hook for user location tracking and proximity disembark alarm.
 * Handles geolocation watching, wake lock, distance checks, audio chime, and vibrations.
 */
export function useGeoAlert() {
  const userCoords = useTransitStore((s) => s.userCoords);
  const userAccuracy = useTransitStore((s) => s.userAccuracy);
  const userHeading = useTransitStore((s) => s.userHeading);
  const userSpeed = useTransitStore((s) => s.userSpeed);
  const isFollowUser = useTransitStore((s) => s.isFollowUser);
  const setUserLocation = useTransitStore((s) => s.setUserLocation);
  const setLocationError = useTransitStore((s) => s.setLocationError);
  const alarmTargetStopId = useTransitStore((s) => s.alarmTargetStopId);
  const isAlarmArmed = useTransitStore((s) => s.isAlarmArmed);
  const alarmThresholdMeters = useTransitStore((s) => s.alarmThresholdMeters);
  const currentDistanceMeters = useTransitStore((s) => s.currentDistanceMeters);
  const isAlarmTriggered = useTransitStore((s) => s.isAlarmTriggered);
  const alarmMuted = useTransitStore((s) => s.alarmMuted);
  const triggerAlarm = useTransitStore((s) => s.triggerAlarm);

  const isSimulatingApproach = useTransitStore((s) => s.isSimulatingApproach);
  const stepApproachSimulation = useTransitStore((s) => s.stepApproachSimulation);

  const chimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFixTimestampRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep screen awake while tracking
  useEffect(() => {
    let wakeLockSentinel: WakeLockSentinel | null = null;

    const acquireLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && navigator.wakeLock) {
        try {
          wakeLockSentinel = await navigator.wakeLock.request('screen');
        } catch {
          // Wake lock may fail if tab is not active or battery saver is engaged
        }
      }
    };

    acquireLock();

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        acquireLock();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, []);

  // Geolocation watch with retry fallback
  useEffect(() => {
    if (isSimulatingApproach) return;

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 8000,
    };

    let watchId: number | null = null;
    let isActive = true;

    const handleSuccess = (pos: GeolocationPosition) => {
      if (!isActive) return;
      lastFixTimestampRef.current = Date.now();
      const { latitude, longitude, accuracy, heading, speed } = pos.coords;

      setUserLocation(
        [latitude, longitude],
        typeof accuracy === 'number' && !isNaN(accuracy) ? accuracy : null,
        typeof heading === 'number' && !isNaN(heading) ? heading : null,
        typeof speed === 'number' && !isNaN(speed) ? speed : null
      );
    };

    const handleError = (err: GeolocationPositionError) => {
      if (!isActive) return;
      // Re-query location if temporary timeout or signal drop
      if (err.code === 3 || err.code === 2) {
        if (!retryTimeoutRef.current) {
          retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;
            if (isActive && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(handleSuccess, () => {}, geoOptions);
            }
          }, 2000);
        }
      } else {
        setLocationError(err.message);
      }
    };

    try {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, geoOptions);
    } catch {
      // Ignore
    }

    // Immediate initial fix
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);

    // Heartbeat check in case watchPosition stalls
    const watchdogInterval = setInterval(() => {
      if (!isActive) return;
      const elapsedSinceFix = Date.now() - lastFixTimestampRef.current;
      if (elapsedSinceFix > 5000 && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);
      }
    }, 3500);

    return () => {
      isActive = false;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(watchdogInterval);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [isSimulatingApproach, setUserLocation, setLocationError]);

  // Approach simulation interval
  useEffect(() => {
    if (!isSimulatingApproach) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      return;
    }

    simIntervalRef.current = setInterval(() => {
      stepApproachSimulation(0.025);
    }, 400);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isSimulatingApproach, stepApproachSimulation]);

  // Trigger alarm when within threshold distance
  useEffect(() => {
    if (!isAlarmArmed || isAlarmTriggered || currentDistanceMeters === null) return;

    if (currentDistanceMeters <= alarmThresholdMeters) {
      triggerAlarm();

      const targetStation = alarmTargetStopId ? STATION_MAP[alarmTargetStopId] : null;
      const stopName = targetStation ? targetStation.name : 'your destination stop';
      sendDisembarkNotification(stopName, currentDistanceMeters);

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([400, 200, 400, 200, 800]);
        } catch {
          // Ignore
        }
      }
    }
  }, [
    isAlarmArmed,
    isAlarmTriggered,
    currentDistanceMeters,
    alarmThresholdMeters,
    alarmTargetStopId,
    triggerAlarm,
  ]);

  // Play repeating alarm chime while active & unmuted
  useEffect(() => {
    if (isAlarmTriggered && !alarmMuted) {
      playDisembarkAlarmChime();

      chimeIntervalRef.current = setInterval(() => {
        playDisembarkAlarmChime();
      }, 2400);
    } else {
      if (chimeIntervalRef.current) {
        clearInterval(chimeIntervalRef.current);
        chimeIntervalRef.current = null;
      }
    }

    return () => {
      if (chimeIntervalRef.current) {
        clearInterval(chimeIntervalRef.current);
        chimeIntervalRef.current = null;
      }
    };
  }, [isAlarmTriggered, alarmMuted]);

  return {
    userCoords,
    userAccuracy,
    userHeading,
    userSpeed,
    isFollowUser,
    currentDistanceMeters,
    isAlarmArmed,
    isAlarmTriggered,
    alarmThresholdMeters,
    alarmMuted,
    isSimulatingApproach,
    requestNotificationPermission,
  };
}
