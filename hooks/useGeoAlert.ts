'use client';

import { useEffect, useRef } from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import { STATION_MAP } from '@/src/data/transitNetwork';
import { playDisembarkAlarmChime } from '@/lib/audio';
import { sendDisembarkNotification, requestNotificationPermission } from '@/lib/notifications';

/**
 * Hook for proximity "Get-Off" Geo-Alarm
 * Coordinates real-time geolocation tracking, Haversine proximity calculations,
 * procedural Web Audio synthesis, Web Notifications, and haptic feedback.
 */
export function useGeoAlert() {
  const userCoords = useTransitStore((s) => s.userCoords);
  const setUserCoords = useTransitStore((s) => s.setUserCoords);
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

  // 1. Real HTML5 Geolocation Tracking
  useEffect(() => {
    if (isSimulatingApproach) return;

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 3000,
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserCoords([pos.coords.latitude, pos.coords.longitude]);
        setLocationError(null);
      },
      (err) => {
        console.info('[GeoAlert] Location notice:', err.message);
        setLocationError(err.message);
      },
      geoOptions
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isSimulatingApproach, setUserCoords, setLocationError]);

  // 2. Approach Simulation Interval
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

  // 3. Proximity Trigger & Alert Execution
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
          // Vibration may be restricted on insecure origins
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

  // 4. Repeated Urgent Audio Chime while alarm is active & unmuted
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
    currentDistanceMeters,
    isAlarmArmed,
    isAlarmTriggered,
    alarmThresholdMeters,
    alarmMuted,
    isSimulatingApproach,
    requestNotificationPermission,
  };
}
