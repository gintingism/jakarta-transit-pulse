'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  RouteLeg,
  NavigationState,
  NavigationStatus,
  NavigationTransitMode,
} from '@/src/types/navigation';
import { useNavigationTracker } from '@/src/lib/navigationTracker';
import { getVoiceNavigator, generateVoiceInstruction, VoiceNavigator } from '@/src/lib/voiceNavigator';
import {
  computeStationProgress,
  StationProgressItem,
} from '@/src/lib/stationProgress';
import {
  Footprints,
  Train,
  Bus,
  ArrowRightLeft,
  Volume2,
  VolumeX,
  Crosshair,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  BellRing,
  Bell,
  Navigation as NavigationIcon,
  MapPin,
  Flag,
  Zap,
  Info,
} from 'lucide-react';
import {
  PlatformGuidance,
  getPlatformGuidance,
} from '@/src/data/platformGuidanceData';
import {
  BackgroundKeepAliveManager,
  getBackgroundKeepAliveManager,
} from '@/src/lib/backgroundKeepAlive';
import { useTransitStore } from '@/stores/useTransitStore';
import { playTransitArrivalChime } from '@/lib/audio';

export interface NavigationHUDProps {
  legs: RouteLeg[];
  onStopNavigation: () => void;
  onPositionUpdate?: (pos: {
    lat: number;
    lng: number;
    accuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  }) => void;
  onActiveLegChange?: (leg: RouteLeg, index: number) => void;
}

export default function NavigationHUD({
  legs,
  onStopNavigation,
  onPositionUpdate,
  onActiveLegChange,
}: NavigationHUDProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showAllPassed, setShowAllPassed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [selectedGuidance, setSelectedGuidance] = useState<PlatformGuidance | null>(null);
  const voiceNavRef = useRef<VoiceNavigator | null>(null);
  const bgKeepAliveRef = useRef<BackgroundKeepAliveManager | null>(null);

  const isAlarmArmed = useTransitStore((s) => s.isAlarmArmed);
  const alarmTargetStopId = useTransitStore((s) => s.alarmTargetStopId);
  const armAlarm = useTransitStore((s) => s.armAlarm);
  const disarmAlarm = useTransitStore((s) => s.disarmAlarm);
  const isBatterySaverMode = useTransitStore((s) => s.isBatterySaverMode);
  const toggleBatterySaverMode = useTransitStore((s) => s.toggleBatterySaverMode);
  const setCurrentLegIndex = useTransitStore((s) => s.setCurrentLegIndex);
  const toggleStationProgress = useTransitStore((s) => s.toggleStationProgress);
  const isStationProgressOpen = useTransitStore((s) => s.isStationProgressOpen);
  const setMapCenter = useTransitStore((s) => s.setMapCenter);

  const onPositionUpdateRef = useRef(onPositionUpdate);
  onPositionUpdateRef.current = onPositionUpdate;
  const onActiveLegChangeRef = useRef(onActiveLegChange);
  onActiveLegChangeRef.current = onActiveLegChange;
  const legsRef = useRef(legs);
  legsRef.current = legs;
  const lastNotifiedPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const legChangeDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeLegRef = useRef<RouteLeg | null>(legs[0] || null);

  // Initialize VoiceNavigator and BackgroundKeepAlive instances
  useEffect(() => {
    if (typeof window !== 'undefined') {
      voiceNavRef.current = getVoiceNavigator(undefined, (speaking) => {
        setIsSpeaking(speaking);
      });

      const bg = getBackgroundKeepAliveManager();
      bg.start();
      bgKeepAliveRef.current = bg;
    }

    return () => {
      if (legChangeDebounceTimerRef.current) {
        clearTimeout(legChangeDebounceTimerRef.current);
      }
      if (!useTransitStore.getState().isAlarmArmed) {
        bgKeepAliveRef.current?.stop();
      }
      bgKeepAliveRef.current = null;
    };
  }, []);

  const handleLegChange = useCallback((index: number, nextLeg: RouteLeg) => {
    activeLegRef.current = nextLeg;
    setCurrentLegIndex(index);
    onActiveLegChangeRef.current?.(nextLeg, index);

    // Clear previous timer if rapid transitions occur
    if (legChangeDebounceTimerRef.current) {
      clearTimeout(legChangeDebounceTimerRef.current);
    }

    // Mark previous/skipped legs as spoken to prevent queue pileup
    const currentLegs = legsRef.current;
    for (let i = 0; i < index; i++) {
      const skippedLeg = currentLegs[i];
      if (skippedLeg) {
        voiceNavRef.current?.markAsSpoken(`leg-${skippedLeg.id}`);
        voiceNavRef.current?.markAsSpoken(`initial-${skippedLeg.id}`);
      }
    }

    // Debounce announcement of the new active step by 300ms using speakLatest
    legChangeDebounceTimerRef.current = setTimeout(() => {
      if (voiceNavRef.current && !voiceNavRef.current.getIsMuted()) {
        voiceNavRef.current.speakLatest(
          `leg-${nextLeg.id}`,
          nextLeg.instruction
        );
      }
    }, 300);
  }, []);

  const handleStatusChange = useCallback((status: NavigationStatus) => {
    if (!voiceNavRef.current || voiceNavRef.current.getIsMuted()) return;

    if (status === 'approaching_destination') {
      const curLeg = activeLegRef.current;
      const text = generateVoiceInstruction({
        type: 'ANTI_BABLAS_WARNING',
        stationName: curLeg?.to?.name || 'tujuan',
      });
      voiceNavRef.current.speakPriority(text);
      bgKeepAliveRef.current?.triggerHaptic([400, 200, 400, 200, 800]);
      bgKeepAliveRef.current?.sendNotification(
        '⚠️ Waktunya Bersiap!',
        `Satu stasiun lagi tiba di ${curLeg?.to?.name || 'tujuan'}. Bersiap turun!`
      );
    } else if (status === 'arrived') {
      playTransitArrivalChime();
      const text = generateVoiceInstruction({ type: 'ARRIVED' });
      voiceNavRef.current?.speakPriority(text);
      bgKeepAliveRef.current?.triggerHaptic([500, 200, 500]);
      bgKeepAliveRef.current?.sendNotification(
        '🎉 Tiba di Tujuan!',
        'Kamu telah sampai di stasiun tujuan. Navigasi selesai.'
      );
    } else if (status === 'off_route') {
      const text = generateVoiceInstruction({ type: 'OFF_ROUTE' });
      voiceNavRef.current?.speakOnce('off-route-warning', text);
    }
  }, []);

  const { state, toggleMute, toggleCenter } = useNavigationTracker(legs, {
    enabled: true,
    onLegChange: handleLegChange,
    onStatusChange: handleStatusChange,
    onPositionUpdate: (pos) => {
      onPositionUpdateRef.current?.(pos);
    },
  });

  // Sync mute state to VoiceNavigator
  useEffect(() => {
    if (voiceNavRef.current) {
      voiceNavRef.current.setMuted(state.isMuted);
    }
  }, [state.isMuted]);

  // Sync tracker leg index to store
  useEffect(() => {
    setCurrentLegIndex(state.currentLegIndex);
  }, [state.currentLegIndex, setCurrentLegIndex]);

  // Notify parent of location changes for map tracking (with 0.00001 deg threshold)
  useEffect(() => {
    if (!onPositionUpdateRef.current) return;
    if (state.currentLocation && state.isCentered) {
      const cur = state.currentLocation;
      const last = lastNotifiedPosRef.current;
      if (
        !last ||
        Math.abs(last.lat - cur.lat) >= 0.00001 ||
        Math.abs(last.lng - cur.lng) >= 0.00001
      ) {
        lastNotifiedPosRef.current = { lat: cur.lat, lng: cur.lng };
        onPositionUpdateRef.current({
          lat: cur.lat,
          lng: cur.lng,
        });
      }
    }
  }, [state.currentLocation, state.isCentered]);

  // Initial instruction speech on navigation start
  useEffect(() => {
    if (legs.length > 0) {
      const firstLeg = legs[0];
      if (!firstLeg) return;

      const initialText =
        firstLeg.type === 'WALK'
          ? generateVoiceInstruction({
              type: 'START_WALK',
              distanceMeters: firstLeg.distanceMeters || 0,
              targetName: firstLeg.to?.name || 'tujuan',
            })
          : `Mulai perjalanan. ${firstLeg.instruction || ''}`;

      const nav = voiceNavRef.current || getVoiceNavigator();
      if (!nav.getIsMuted()) {
        nav.speakOnce(`initial-${firstLeg.id}`, initialText);
        nav.markAsSpoken(`leg-${firstLeg.id}`);
      }
    }
  }, [legs]);

  const currentLeg = state.legs[state.currentLegIndex] || legs[0];
  const completedLegs = useMemo(
    () => state.legs.filter((l) => l.status === 'completed'),
    [state.legs]
  );

  const toggleAlarm = useCallback(() => {
    if (isAlarmArmed) {
      disarmAlarm();
    } else {
      const targetId = currentLeg?.to?.id;
      armAlarm(targetId);
    }
  }, [isAlarmArmed, currentLeg, armAlarm, disarmAlarm]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !state.isMuted;
    toggleMute();
    voiceNavRef.current?.setMuted(nextMuted);
    if (!nextMuted) {
      setTimeout(() => {
        voiceNavRef.current?.speak('Panduan suara diaktifkan', true);
      }, 50);
    }
  }, [toggleMute, state.isMuted]);

  const replayCurrentInstruction = useCallback(() => {
    if (!voiceNavRef.current || !currentLeg) return;
    voiceNavRef.current.setMuted(false);
    voiceNavRef.current.speak(currentLeg.instruction, true);
  }, [currentLeg]);

  const handleStopNavigation = useCallback(() => {
    voiceNavRef.current?.resetHistory();
    onStopNavigation();
  }, [onStopNavigation]);

  // Sync MediaSession lock screen whenever leg or distance updates
  useEffect(() => {
    if (currentLeg && bgKeepAliveRef.current) {
      bgKeepAliveRef.current.updateLockScreen({
        instruction: currentLeg.instruction,
        distanceMeters: state.distanceToNextStopMeters,
        targetName: currentLeg.to?.name || 'Tujuan',
        lineName: currentLeg.lineName,
      });
    }
  }, [currentLeg, state.distanceToNextStopMeters]);

  if (!legs || legs.length === 0 || !currentLeg) {
    return null;
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const getLegIcon = (leg?: RouteLeg) => {
    if (!leg) return <Train className="w-5 h-5 text-sky-400" />;
    if (leg.type === 'WALK') return <Footprints className="w-5 h-5 text-emerald-400" />;
    if (leg.type === 'TRANSFER') return <ArrowRightLeft className="w-5 h-5 text-amber-400" />;
    if (leg.mode === 'TJ') return <Bus className="w-5 h-5 text-rose-400" />;
    return <Train className="w-5 h-5 text-sky-400" />;
  };

  const stationProgress = useMemo(
    () =>
      computeStationProgress({
        legs,
        currentLegIndex: state.currentLegIndex,
        userPos: state.currentLocation
          ? { lat: state.currentLocation.lat, lng: state.currentLocation.lng }
          : null,
      }),
    [legs, state.currentLegIndex, state.currentLocation]
  );

  const estimateMinutes = (meters: number | null, mode?: NavigationTransitMode, legType?: string) => {
    if (meters === null) return null;
    const speedMpm = mode === 'TJ' ? 416 : legType === 'WALK' ? 83 : 750;
    const mins = Math.max(1, Math.round(meters / speedMpm));
    return `~${mins} mnt`;
  };

  const handleStationSelect = (station: StationProgressItem) => {
    setMapCenter(station.coords, 16);
  };

  const handleToggleAlarm = (stationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAlarmArmed && alarmTargetStopId === stationId) {
      disarmAlarm();
    } else {
      armAlarm(stationId);
    }
  };

  const currentStation = stationProgress.currentStation;
  const passedStations = stationProgress.items.filter((st) => st.status === 'passed');
  const shouldCollapsePassed = passedStations.length > 2 && !showAllPassed;

  return (
    <div className="fixed top-2.5 left-2.5 right-2.5 sm:left-4 sm:right-auto sm:w-[390px] z-40 flex flex-col gap-1.5 font-sans select-none animate-in fade-in slide-in-from-top-3 duration-300">
      {/* 1. Status Banners (Anti-Bablas / Off-Route / GPS Lost) */}
      {state.status === 'approaching_destination' && (
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 text-white px-3.5 py-2 rounded-xl shadow-lg flex items-center justify-between text-xs font-bold border border-rose-400/40 animate-pulse">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 animate-bounce" />
            <span>Peringatan Anti-Bablas: Satu stasiun lagi tiba!</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/25">H-1</span>
        </div>
      )}

      {state.status === 'off_route' && (
        <div className="bg-amber-600/95 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold border border-amber-400/40">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200" />
          <span>Anda berada di luar jalur (&gt;100m). Silakan ikuti kembali rute.</span>
        </div>
      )}

      {state.status === 'gps_lost' && (
        <div className="bg-rose-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold border border-rose-700/60">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-300" />
          <span>Sinyal GPS lemah atau izin lokasi belum diberikan.</span>
        </div>
      )}

      {/* 2. Minimized Pill vs Full Turn-by-Turn Card */}
      {isMinimized ? (
        <div
          onClick={() => setIsMinimized(false)}
          className="bg-[#0b101b]/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl sm:rounded-2xl shadow-2xl px-2.5 py-1.5 text-white flex items-center justify-between gap-2 cursor-pointer hover:border-cyan-400 transition select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shrink-0">
              {getLegIcon(currentLeg)}
            </div>

            <div className="min-w-0 flex items-baseline gap-1.5">
              <span className="text-sm font-black font-mono tabular-nums text-cyan-400 shrink-0">
                {formatDistance(state.distanceToNextStopMeters)}
              </span>
              <span className="text-xs font-semibold text-zinc-100 truncate">
                {currentLeg.instruction}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Quick Station Chevron Pill in Minimized Mode */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
                if (!isStationProgressOpen) {
                  toggleStationProgress();
                }
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-[10px] transition cursor-pointer"
              title="Buka Daftar Stasiun"
              aria-label="Open station list"
            >
              <Train className="w-3 h-3 text-cyan-400" />
              <span className="tabular-nums font-mono">{stationProgress.passedCount}/{stationProgress.totalStations}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Battery Saver Button in Minimized Pill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleBatterySaverMode();
              }}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isBatterySaverMode
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
              title={
                isBatterySaverMode
                  ? 'Mode Hemat Daya Cerdas: Aktif'
                  : 'Mode Hemat Daya Cerdas: Nonaktif (Klik untuk aktifkan)'
              }
              aria-label="Toggle battery saver mode"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>

            {/* Recenter GPS */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCenter();
              }}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                state.isCentered
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
              }`}
              title="Kunci Kamera GPS"
              aria-label="Center GPS"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            {/* Expand Navigation Card */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Perbesar Tampilan Navigasi"
              aria-label="Expand navigation HUD"
            >
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#0b101b]/95 backdrop-blur-xl border border-cyan-500/25 rounded-2xl shadow-2xl p-2.5 sm:p-3 text-white overflow-hidden relative">
          {/* Main Direction Row (Streamlined & Compact) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center shrink-0">
                {getLegIcon(currentLeg)}
              </div>

              <div
                onClick={replayCurrentInstruction}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    replayCurrentInstruction();
                  }
                }}
                className="min-w-0 flex-1 cursor-pointer group/inst transition select-none"
                title="Klik untuk mendengarkan ulang panduan suara"
                aria-label={`Instruksi: ${currentLeg.instruction}. Klik untuk dengarkan ulang.`}
              >
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-base sm:text-lg font-black font-mono tabular-nums text-cyan-400 tracking-tight shrink-0">
                    {formatDistance(state.distanceToNextStopMeters)}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover/inst:text-cyan-200 transition truncate min-w-0 leading-tight">
                    {currentLeg.instruction}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 truncate">
                  <span className="font-semibold text-cyan-400 font-mono">
                    {currentLeg.type === 'WALK'
                      ? 'Jalan Kaki'
                      : currentLeg.type === 'TRANSFER'
                      ? 'Pindah Peron'
                      : `${currentLeg.mode || 'TRANSIT'} ${currentLeg.lineName || ''}`}
                  </span>
                  <span>•</span>
                  <span className="truncate">Ke: {currentLeg.to?.name || 'Tujuan'}</span>

                  {isSpeaking && (
                    <span className="flex items-center gap-0.5 ml-0.5" title="Pemandu suara sedang berbicara">
                      <span className="w-0.5 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-0.5 h-3 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-0.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Control Cluster */}
            <div className="flex items-center gap-0.5 bg-zinc-900/70 p-0.5 rounded-xl border border-zinc-800/80 shrink-0">
              {/* Single Smart Voice Guidance Toggle (Mute / Unmute) */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-1 sm:p-1.5 rounded-lg transition cursor-pointer ${
                  state.isMuted
                    ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80'
                    : 'text-cyan-400 hover:bg-cyan-500/20 bg-cyan-500/10'
                }`}
                title={
                  state.isMuted
                    ? 'Panduan Suara: Dibisukan (Klik untuk aktifkan)'
                    : 'Panduan Suara: Aktif (Klik untuk bisukan)'
                }
                aria-label={state.isMuted ? 'Aktifkan suara navigasi' : 'Bisukan suara navigasi'}
              >
                {state.isMuted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Recenter GPS */}
              <button
                type="button"
                onClick={toggleCenter}
                className={`p-1 sm:p-1.5 rounded-lg transition cursor-pointer ${
                  state.isCentered
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={state.isCentered ? 'Kamera Mengikuti Lokasi Anda' : 'Kunci Kamera ke Lokasi GPS'}
                aria-label="Center GPS"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>

              {/* Mode Hemat Daya Cerdas Toggle */}
              <button
                type="button"
                onClick={toggleBatterySaverMode}
                className={`p-1 sm:p-1.5 rounded-lg transition cursor-pointer ${
                  isBatterySaverMode
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={
                  isBatterySaverMode
                    ? 'Mode Hemat Daya Cerdas: Aktif (GPS adaptif >2km)'
                    : 'Mode Hemat Daya Cerdas: Nonaktif (Klik untuk aktifkan)'
                }
                aria-label="Toggle battery saver mode"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>

              {/* Disembark Alarm Toggle */}
              <button
                type="button"
                onClick={toggleAlarm}
                className={`p-1 sm:p-1.5 rounded-lg transition cursor-pointer ${
                  isAlarmArmed
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={isAlarmArmed ? 'Alarm Turun Aktif' : 'Pasang Alarm Pengingat Turun'}
                aria-label="Toggle disembark alarm"
              >
                {isAlarmArmed ? (
                  <BellRing className="w-3.5 h-3.5 animate-bounce text-amber-400" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Minimize Card */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1 sm:p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                title="Ciutkan Tampilan (Minimize)"
                aria-label="Minimize navigation card"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>

              {/* Stop Navigation */}
              <button
                type="button"
                onClick={handleStopNavigation}
                className="p-1 sm:p-1.5 rounded-lg text-rose-400 hover:bg-rose-600/20 hover:text-rose-300 transition cursor-pointer"
                title="Akhiri Navigasi"
                aria-label="Stop navigation"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Platform & Transfer Guidance Pill (if available for this leg) */}
          {currentLeg.platformGuidance && (
            <div
              onClick={() => {
                setSelectedGuidance(currentLeg.platformGuidance || null);
                setIsPlatformModalOpen(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedGuidance(currentLeg.platformGuidance || null);
                  setIsPlatformModalOpen(true);
                }
              }}
              className="mt-1.5 px-2.5 py-1 rounded-xl bg-sky-950/70 hover:bg-sky-900/70 border border-sky-500/40 text-sky-200 text-[10.5px] flex items-center justify-between gap-1.5 transition cursor-pointer select-none group"
              title="Lihat Detail Panduan Peron, Jalur, & Gate"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-extrabold text-sky-300 flex items-center gap-1 shrink-0">
                  <Train className="w-3 h-3 text-sky-400" />
                  <span>{currentLeg.platformGuidance.platform}</span>
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-300 truncate font-medium">
                  {currentLeg.platformGuidance.level}
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-sky-300 truncate">
                  {currentLeg.platformGuidance.direction}
                </span>
              </div>

              <span className="text-[9.5px] text-sky-400 group-hover:text-sky-300 font-bold flex items-center gap-0.5 shrink-0 bg-sky-500/20 px-1.5 py-0.5 rounded border border-sky-500/30">
                <Info className="w-2.5 h-2.5" />
                <span>Info Peron</span>
              </span>
            </div>
          )}

          {/* Unified Ultra-Compact Station Progress Chevron Pill */}
          <div
            onClick={toggleStationProgress}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleStationProgress();
              }
            }}
            className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-cyan-500/40 transition cursor-pointer group relative overflow-hidden select-none"
            title={isStationProgressOpen ? 'Tutup Daftar Stasiun' : 'Buka Timeline Daftar Stasiun'}
            aria-label={isStationProgressOpen ? 'Tutup daftar stasiun' : 'Buka daftar stasiun'}
            aria-expanded={isStationProgressOpen}
          >
            {/* Embedded Micro Progress Line at the bottom of the pill */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-800/80">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 transition-all duration-300"
                style={{ width: `${stationProgress.progressPercent}%` }}
              />
            </div>

            {/* Left: Active/Next Station Name & Distance */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <div className="flex items-baseline gap-1.5 min-w-0 text-[11px] truncate">
                <span className="font-bold text-cyan-300 truncate">
                  {currentStation?.status === 'current' &&
                  currentStation.distanceToUserMeters !== null &&
                  currentStation.distanceToUserMeters <= 80
                    ? `Di Sini: ${currentStation.name}`
                    : `Berikutnya: ${currentStation?.name || currentLeg.to?.name || 'Tujuan'}`}
                </span>
                {currentStation && currentStation.distanceToUserMeters !== null && (
                  <span className="text-[10px] text-zinc-400 font-mono tabular-nums shrink-0">
                    • {formatDistance(currentStation.distanceToUserMeters)}
                    {estimateMinutes(
                      currentStation.distanceToUserMeters,
                      currentStation.mode,
                      currentStation.legType
                    )
                      ? ` (${estimateMinutes(
                          currentStation.distanceToUserMeters,
                          currentStation.mode,
                          currentStation.legType
                        )})`
                      : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Right: The Chevron Pill */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/15 group-hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-[10px] transition">
                <Train className="w-3 h-3 text-cyan-400" />
                <span className="tabular-nums font-mono">
                  {stationProgress.passedCount}/{stationProgress.totalStations}
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-cyan-400 transition-transform duration-200 ${
                    isStationProgressOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Collapsible Station Timeline Dropdown (Compact & Map-Friendly) */}
      {!isMinimized && isStationProgressOpen && (
        <div className="bg-[#0b101b]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-cyan-500/20 max-h-[38vh] flex flex-col text-xs text-white animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2.5 pb-2 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <NavigationIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Timeline Stasiun Perjalanan</span>
            </div>

            <div className="flex items-center gap-2 text-[10.5px] text-zinc-400">
              <span className="tabular-nums text-emerald-400 font-medium">{stationProgress.passedCount} Lewat</span>
              <span>•</span>
              <span className="tabular-nums text-cyan-400 font-medium">{stationProgress.remainingCount} Sisa</span>
              <button
                type="button"
                onClick={toggleStationProgress}
                className="ml-1 p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                title="Tutup Daftar Stasiun"
                aria-label="Close station list"
              >
                <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          </div>

          <div className="p-2 overflow-y-auto space-y-1 divide-y divide-transparent">
            {/* Collapsed passed stations button */}
            {shouldCollapsePassed && (
              <button
                type="button"
                onClick={() => setShowAllPassed(true)}
                className="w-full py-1 px-2 mb-1 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 flex items-center justify-between text-[10.5px] text-zinc-400 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>{passedStations.length} stasiun sebelumnya telah dilewati</span>
                </div>
                <span className="text-[10px] text-cyan-400 underline underline-offset-2">
                  Tampilkan
                </span>
              </button>
            )}

            {/* Station Items */}
            {stationProgress.items.map((station, idx) => {
              const isPassed = station.status === 'passed';
              const isCurrent = station.status === 'current';
              const isAlarmOnThis = isAlarmArmed && alarmTargetStopId === station.id;

              if (shouldCollapsePassed && isPassed) return null;

              return (
                <div
                  key={`hud_st_${station.id}_${idx}`}
                  onClick={() => handleStationSelect(station)}
                  className={`relative flex items-start gap-2 p-1.5 rounded-xl transition cursor-pointer group ${
                    isCurrent
                      ? 'bg-gradient-to-r from-cyan-950/70 via-blue-950/60 to-zinc-900/70 border border-cyan-500/50 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                      : isPassed
                      ? 'hover:bg-zinc-900/40 opacity-70'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  {/* Indicator Column */}
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    {isPassed ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      </div>
                    ) : isCurrent ? (
                      <div className="relative flex items-center justify-center w-3.5 h-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400 border border-zinc-950 shadow-md shadow-cyan-400/50" />
                      </div>
                    ) : (
                      <div
                        className="w-3 h-3 rounded-full border-2 border-zinc-500 bg-zinc-900 group-hover:border-cyan-400 transition"
                        style={{ borderColor: station.lineColor || undefined }}
                      />
                    )}
                    {idx < stationProgress.items.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 min-h-[14px] mt-0.5 ${
                          isPassed ? 'bg-emerald-500/30' : 'bg-zinc-800'
                        }`}
                      />
                    )}
                  </div>

                  {/* Station Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[11.5px] ${
                          isCurrent
                            ? 'font-black text-white'
                            : isPassed
                            ? 'font-medium text-zinc-400 line-through'
                            : 'font-semibold text-zinc-200'
                        }`}
                      >
                        {station.name}
                      </span>

                      {isCurrent && (
                        <span className="text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                          {station.distanceToUserMeters !== null && station.distanceToUserMeters <= 80
                            ? 'Di Sini'
                            : 'Berikutnya'}
                        </span>
                      )}

                      {station.isDestination && (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center gap-1">
                          <Flag className="w-2.5 h-2.5 text-rose-400" />
                          Tujuan
                        </span>
                      )}

                      {station.isTransfer && (
                        <span className="text-[8px] font-semibold px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                          <ArrowRightLeft className="w-2.5 h-2.5 text-amber-400" />
                          Transit: {station.transferToLineName || 'Lin Lain'}
                        </span>
                      )}

                      {(() => {
                        const guidance = getPlatformGuidance(station.id);
                        if (!guidance) return null;
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGuidance(guidance);
                              setIsPlatformModalOpen(true);
                            }}
                            className="text-[8px] font-semibold px-1.5 py-0.2 rounded bg-sky-950/70 hover:bg-sky-900/80 border border-sky-500/40 text-sky-300 flex items-center gap-1 transition cursor-pointer"
                            title={`Lihat info ${guidance.platform} & gate`}
                            aria-label={`Info peron ${station.name}`}
                          >
                            <Train className="w-2.5 h-2.5 text-sky-400" />
                            <span>{guidance.platform}</span>
                            <Info className="w-2 h-2 text-sky-400/80" />
                          </button>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-2 text-[9.5px] text-zinc-400 mt-0.5">
                      {station.lineName && (
                        <span className="font-mono" style={{ color: station.lineColor || undefined }}>
                          {station.lineName}
                        </span>
                      )}
                      {station.distanceToUserMeters !== null && (
                        <>
                          <span>•</span>
                          <span className="font-mono tabular-nums text-zinc-300">
                            {formatDistance(station.distanceToUserMeters)}
                          </span>
                          {isCurrent && (
                            <>
                              <span>•</span>
                              <span className="text-cyan-300">
                                {estimateMinutes(station.distanceToUserMeters, station.mode, station.legType)}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 1-Tap Alarm */}
                  <div className="shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleToggleAlarm(station.id, e)}
                      className={`p-1 rounded-lg border transition cursor-pointer ${
                        isAlarmOnThis
                          ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                          : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                      }`}
                      title={isAlarmOnThis ? 'Alarm aktif (Klik untuk matikan)' : `Pasang alarm di ${station.name}`}
                      aria-label={`Toggle alarm for ${station.name}`}
                    >
                      {isAlarmOnThis ? (
                        <BellRing className="w-3 h-3 animate-bounce" />
                      ) : (
                        <Bell className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-1 border-t border-zinc-800/80 text-center bg-[#070b13]">
            <button
              type="button"
              onClick={toggleStationProgress}
              className="text-[10px] text-zinc-400 hover:text-white transition flex items-center justify-center gap-1 w-full py-0.5 cursor-pointer"
            >
              <span>Tutup Timeline Stasiun</span>
              <ChevronUp className="w-3 h-3 text-cyan-400" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Platform & Transfer Guidance Modal */}
      {isPlatformModalOpen && selectedGuidance && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsPlatformModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="platform-modal-title"
        >
          <div
            className="w-full max-w-sm sm:max-w-md bg-zinc-950/95 border border-sky-500/40 rounded-2xl shadow-2xl p-4 sm:p-5 text-white flex flex-col gap-3.5 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-sm">
                  <Train className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 id="platform-modal-title" className="text-sm sm:text-base font-bold text-white truncate">
                    {selectedGuidance.stationName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold">
                    <span>Panduan Peron & Transfer</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPlatformModalOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                title="Tutup"
                aria-label="Tutup panduan peron"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform & Level Highlight */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold text-sky-400/90 tracking-wider">Peron / Jalur</span>
                <span className="text-xs sm:text-sm font-black text-white">{selectedGuidance.platform}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Posisi / Tingkat</span>
                <span className="text-xs sm:text-sm font-semibold text-zinc-200">{selectedGuidance.level}</span>
              </div>
            </div>

            {/* Direction */}
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              <div className="text-xs min-w-0 truncate">
                <span className="text-zinc-400 font-medium">Arah: </span>
                <span className="font-bold text-cyan-300">{selectedGuidance.direction}</span>
              </div>
            </div>

            {/* Transfer Tips */}
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Tips Transit & Perpindahan</span>
              </div>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                {selectedGuidance.transferTips}
              </p>
            </div>

            {/* Gate Info */}
            {selectedGuidance.gateInfo && (
              <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="text-zinc-400 font-medium">Akses Gate: </span>
                  <span className="text-zinc-200">{selectedGuidance.gateInfo}</span>
                </div>
              </div>
            )}

            {/* Facilities */}
            {selectedGuidance.facilities && selectedGuidance.facilities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {selectedGuidance.facilities.map((fac, idx) => (
                  <span
                    key={`fac_${idx}`}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium"
                  >
                    {fac}
                  </span>
                ))}
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsPlatformModalOpen(false)}
              className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-sky-600/20 mt-1"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
