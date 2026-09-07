'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Station, STATION_MAP } from '@/src/data/transitNetwork';
import { calculateHaversineDistance, formatDistance } from '@/src/lib/transitEngine';

export interface UseGeoAlarmProps {
  targetStationId: string | null;
  thresholdMeters?: number;
}

export interface UseGeoAlarmReturn {
  targetStation: Station | null;
  targetStationId: string | null;
  isArmed: boolean;
  userCoords: [number, number] | null;
  distanceMeters: number | null;
  formattedDistance: string;
  isTriggered: boolean;
  thresholdMeters: number;
  isSimulating: boolean;
  hasNotificationPermission: boolean;
  armAlarm: (stationId?: string) => void;
  disarmAlarm: () => void;
  dismissAlarm: () => void;
  setThreshold: (meters: number) => void;
  requestNotification: () => Promise<boolean>;
  startSimulation: () => void;
  stopSimulation: () => void;
}

/**
 * Synthetic Web Audio API Chime & Alarm Sound Synthesizer.
 * Generates clear, resonant station chimes and urgent disembark frequencies in-memory.
 */
function playSyntheticChime(urgent: boolean = false) {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (urgent) {
      // Urgent wake-up two-tone siren
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.setValueAtTime(587.33, now + 0.2); // D5
      osc1.frequency.setValueAtTime(880, now + 0.4);
      osc1.frequency.setValueAtTime(587.33, now + 0.6);

      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(293.66, now + 0.2);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.9);
      osc2.stop(now + 0.9);
    } else {
      // Pleasant transit bell chime: C5 -> E5 -> G5
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0.2, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.5);
      });
    }
  } catch (err) {
    console.warn('[GeoAlarm] AudioContext initialization deferred:', err);
  }
}

/**
 * Triggers mobile device haptic vibration if supported.
 */
function triggerVibration(pattern: number[] = [300, 150, 300]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration restrictions
    }
  }
}

/**
 * Custom hook for Proximity "Get-Off / Wake-Up" Geo-Alarm.
 */
export function useGeoAlarm({
  targetStationId: initialTargetId = null,
  thresholdMeters: defaultThreshold = 400,
}: UseGeoAlarmProps = { targetStationId: null }): UseGeoAlarmReturn {
  const [targetStationId, setTargetStationId] = useState<string | null>(
    initialTargetId
  );
  const [thresholdMeters, setThresholdMeters] = useState<number>(defaultThreshold);
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isTriggered, setIsTriggered] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasFiredAlertRef = useRef<boolean>(false);

  const targetStation = targetStationId ? STATION_MAP[targetStationId] || null : null;

  // Sync initial target
  useEffect(() => {
    if (initialTargetId && initialTargetId !== targetStationId) {
      setTargetStationId(initialTargetId);
    }
  }, [initialTargetId, targetStationId]);

  // Check existing notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasNotificationPermission(Notification.permission === 'granted');
    }
  }, []);

  const triggerDisembarkAlert = useCallback(
    (station: Station, currentDistance: number) => {
      if (hasFiredAlertRef.current) return;
      hasFiredAlertRef.current = true;
      setIsTriggered(true);

      // 1. Play synthesized audio alarm
      playSyntheticChime(true);

      // 2. Trigger mobile vibration pattern
      triggerVibration([300, 150, 300]);

      // 3. Send Web Notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            new Notification('⚠️ Waktunya Turun!', {
              body: `Anda berada ${formatDistance(
                currentDistance
              )} dari ${station.name}. Bersiap untuk turun!`,
              icon: '/icon.png',
              tag: 'transit-disembark-alarm',
              requireInteraction: true,
            });
          } catch (e) {
            console.warn('[GeoAlarm] Notification failed to dispatch:', e);
          }
        }
      }
    },
    []
  );

  // Watch position when armed
  useEffect(() => {
    if (!isArmed || !targetStation || isSimulating) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserCoords(coords);

        const dist = calculateHaversineDistance(coords, targetStation.coords);
        setDistanceMeters(dist);

        if (dist <= thresholdMeters) {
          triggerDisembarkAlert(targetStation, dist);
        }
      },
      (err) => {
        console.warn('[GeoAlarm] Geolocation watch error:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isArmed, targetStation, thresholdMeters, isSimulating, triggerDisembarkAlert]);

  const armAlarm = useCallback((stationId?: string) => {
    if (stationId) {
      setTargetStationId(stationId);
    }
    hasFiredAlertRef.current = false;
    setIsTriggered(false);
    setIsArmed(true);
    playSyntheticChime(false); // Friendly arming confirmation sound
  }, []);

  const disarmAlarm = useCallback(() => {
    setIsArmed(false);
    setIsTriggered(false);
    hasFiredAlertRef.current = false;
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
      setIsSimulating(false);
    }
  }, []);

  const dismissAlarm = useCallback(() => {
    setIsTriggered(false);
  }, []);

  const setThreshold = useCallback((meters: number) => {
    setThresholdMeters(meters);
  }, []);

  const requestNotification = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasNotificationPermission(granted);
      return granted;
    } catch {
      return false;
    }
  }, []);

  // Approach simulation for demonstration & testing
  const startSimulation = useCallback(() => {
    if (!targetStation) return;

    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }

    setIsSimulating(true);
    setIsArmed(true);
    hasFiredAlertRef.current = false;
    setIsTriggered(false);

    let progress = 0;
    const startOffsetLat = 0.018; // ~2 km away
    const startOffsetLng = 0.018;

    simIntervalRef.current = setInterval(() => {
      progress += 0.07;
      const currentLat =
        targetStation.coords[0] + startOffsetLat * (1 - progress);
      const currentLng =
        targetStation.coords[1] + startOffsetLng * (1 - progress);

      const simCoords: [number, number] = [currentLat, currentLng];
      setUserCoords(simCoords);

      const dist = calculateHaversineDistance(simCoords, targetStation.coords);
      setDistanceMeters(dist);

      if (dist <= thresholdMeters) {
        triggerDisembarkAlert(targetStation, dist);
      }

      if (progress >= 1) {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
          setIsSimulating(false);
        }
      }
    }, 500);
  }, [targetStation, thresholdMeters, triggerDisembarkAlert]);

  const stopSimulation = useCallback(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulating(false);
  }, []);

  return {
    targetStation,
    targetStationId,
    isArmed,
    userCoords,
    distanceMeters,
    formattedDistance: distanceMeters !== null ? formatDistance(distanceMeters) : '--',
    isTriggered,
    thresholdMeters,
    isSimulating,
    hasNotificationPermission,
    armAlarm,
    disarmAlarm,
    dismissAlarm,
    setThreshold,
    requestNotification,
    startSimulation,
    stopSimulation,
  };
}
