'use client';

import { useEffect, useRef } from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import { STATION_MAP } from '@/src/data/transitNetwork';
import { playDisembarkAlarmChime } from '@/lib/audio';
import { sendDisembarkNotification, requestNotificationPermission } from '@/lib/notifications';
import { getBackgroundKeepAliveManager } from '@/src/lib/backgroundKeepAlive';

/**
 * Hook for user location tracking and proximity disembark alarm.
 * Handles geolocation watching, wake lock, background audio keep-alive, distance checks, audio chime, and vibrations.
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
  const isNavigating = useTransitStore((s) => s.isNavigating);
  const isBatterySaverMode = useTransitStore((s) => s.isBatterySaverMode);

  const isSimulatingApproach = useTransitStore((s) => s.isSimulatingApproach);
  const stepApproachSimulation = useTransitStore((s) => s.stepApproachSimulation);

  const chimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFixTimestampRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockSentinelRef = useRef<WakeLockSentinel | null>(null);
  const prevIsTriggeredRef = useRef<boolean>(false);

  // 1. Screen Wake Lock Management (keeps screen awake when alarm is armed or navigating)
  useEffect(() => {
    let isMounted = true;
    const shouldKeepAwake = isAlarmArmed || isNavigating;

    const acquireLock = async () => {
      if (!shouldKeepAwake) {
        if (wakeLockSentinelRef.current) {
          wakeLockSentinelRef.current.release().catch(() => {});
          wakeLockSentinelRef.current = null;
        }
        return;
      }

      if (
        typeof navigator !== 'undefined' &&
        'wakeLock' in navigator &&
        navigator.wakeLock &&
        (!wakeLockSentinelRef.current || wakeLockSentinelRef.current.released)
      ) {
        try {
          const sentinel = await navigator.wakeLock.request('screen');
          if (isMounted) {
            wakeLockSentinelRef.current = sentinel;
          } else {
            sentinel.release().catch(() => {});
          }
        } catch {
          // Wake lock may fail if tab is not active or battery saver is engaged
        }
      }
    };

    void acquireLock();

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void acquireLock();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
      if (wakeLockSentinelRef.current) {
        wakeLockSentinelRef.current.release().catch(() => {});
        wakeLockSentinelRef.current = null;
      }
    };
  }, [isAlarmArmed, isNavigating]);

  // 2. Background Audio Keep-Alive for Geo-Alarm (keeps JS thread & GPS alive while screen is locked/off in pocket)
  useEffect(() => {
    const bg = getBackgroundKeepAliveManager();
    const shouldRun = isAlarmArmed || isNavigating;

    if (shouldRun) {
      bg.start();
      const targetStation = alarmTargetStopId ? STATION_MAP[alarmTargetStopId] : null;
      if (targetStation) {
        bg.updateLockScreen({
          instruction: isAlarmTriggered
            ? '🚨 WAKTUNYA TURUN SEKARANG!'
            : '🚨 Alarm Anti-Bablas Aktif',
          distanceMeters: currentDistanceMeters ?? 1000,
          targetName: targetStation.name,
        });
      }
    } else {
      bg.stop();
    }
  }, [isAlarmArmed, isNavigating, alarmTargetStopId, currentDistanceMeters, isAlarmTriggered]);

  // 3. Geolocation watch with retry fallback and fast wake-up sync
  useEffect(() => {
    if (isSimulatingApproach) return;

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    // Adaptive GPS battery saver: If battery saver is active and user is still far (> 2000m) from target,
    // use power-efficient settings; automatically elevate to high-accuracy when approaching (<= 2000m).
    const isFarFromTarget = isBatterySaverMode && currentDistanceMeters !== null && currentDistanceMeters > 2000;

    const geoOptions: PositionOptions = {
      enableHighAccuracy: !isFarFromTarget,
      maximumAge: isFarFromTarget ? 10000 : 0,
      timeout: isFarFromTarget ? 15000 : 8000,
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

    // Fast initial fix for instant UI rendering (<100ms on cached/cellular/wifi)
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      () => {},
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 3000 }
    );

    try {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, geoOptions);
    } catch {
      // Ignore
    }

    // High-accuracy initial fix
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);

    // Fast wake-up sync: refresh position immediately when phone screen turns on or user returns to tab
    const handleWakeUp = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isActive && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
        });
      }
    };

    document.addEventListener('visibilitychange', handleWakeUp);
    window.addEventListener('focus', handleWakeUp);

    // Heartbeat check in case watchPosition stalls
    const watchdogFrequency = isFarFromTarget ? 15000 : 3500;
    const watchdogInterval = setInterval(() => {
      if (!isActive) return;
      const elapsedSinceFix = Date.now() - lastFixTimestampRef.current;
      const maxElapsed = isFarFromTarget ? 20000 : 5000;
      if (elapsedSinceFix > maxElapsed && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);
      }
    }, watchdogFrequency);

    return () => {
      isActive = false;
      document.removeEventListener('visibilitychange', handleWakeUp);
      window.removeEventListener('focus', handleWakeUp);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(watchdogInterval);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [
    isSimulatingApproach,
    setUserLocation,
    setLocationError,
    isBatterySaverMode,
    currentDistanceMeters !== null && currentDistanceMeters > 2000,
  ]);

  // 4. Approach simulation interval
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

  // 5. Trigger alarm when within threshold distance
  useEffect(() => {
    if (
      isAlarmArmed &&
      !isAlarmTriggered &&
      currentDistanceMeters !== null &&
      currentDistanceMeters <= alarmThresholdMeters
    ) {
      triggerAlarm();
    }
  }, [
    isAlarmArmed,
    isAlarmTriggered,
    currentDistanceMeters,
    alarmThresholdMeters,
    triggerAlarm,
  ]);

  // 5b. Dispatch notification, haptics, and lockscreen prompt whenever alarm is triggered
  useEffect(() => {
    if (isAlarmTriggered && !prevIsTriggeredRef.current) {
      const targetStation = alarmTargetStopId ? STATION_MAP[alarmTargetStopId] : null;
      const stopName = targetStation ? targetStation.name : 'stasiun tujuan Anda';
      sendDisembarkNotification(stopName, currentDistanceMeters ?? alarmThresholdMeters);

      const bg = getBackgroundKeepAliveManager();
      bg.triggerHaptic([500, 200, 500, 200, 1000]);
      if (targetStation) {
        bg.updateLockScreen({
          instruction: '🚨 WAKTUNYA TURUN SEKARANG!',
          distanceMeters: currentDistanceMeters ?? 0,
          targetName: targetStation.name,
        });
      }
    }
    prevIsTriggeredRef.current = isAlarmTriggered;
  }, [
    isAlarmTriggered,
    alarmTargetStopId,
    currentDistanceMeters,
    alarmThresholdMeters,
  ]);

  // 6. Play repeating alarm chime while active & unmuted
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
