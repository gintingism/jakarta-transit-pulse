'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  RouteLeg,
  NavigationState,
  NavigationStatus,
} from '@/src/types/navigation';
import { useNavigationTracker } from '@/src/lib/navigationTracker';
import { getVoiceNavigator, generateVoiceInstruction, VoiceNavigator } from '@/src/lib/voiceNavigator';
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
} from 'lucide-react';
import { BackgroundKeepAliveManager } from '@/src/lib/backgroundKeepAlive';
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceNavRef = useRef<VoiceNavigator | null>(null);
  const bgKeepAliveRef = useRef<BackgroundKeepAliveManager | null>(null);

  const isAlarmArmed = useTransitStore((s) => s.isAlarmArmed);
  const armAlarm = useTransitStore((s) => s.armAlarm);
  const disarmAlarm = useTransitStore((s) => s.disarmAlarm);

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

      const bg = new BackgroundKeepAliveManager();
      bg.start();
      bgKeepAliveRef.current = bg;
    }

    return () => {
      if (legChangeDebounceTimerRef.current) {
        clearTimeout(legChangeDebounceTimerRef.current);
      }
      bgKeepAliveRef.current?.stop();
      bgKeepAliveRef.current = null;
    };
  }, []);

  const handleLegChange = useCallback((index: number, nextLeg: RouteLeg) => {
    activeLegRef.current = nextLeg;
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

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-6 sm:right-auto sm:w-[440px] z-40 flex flex-col gap-2 font-sans select-none animate-in fade-in slide-in-from-top-4 duration-300">
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
          className="bg-[#0b101b]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl p-3 text-white flex items-center justify-between gap-3 cursor-pointer hover:border-cyan-400 transition select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shrink-0">
              {getLegIcon(currentLeg)}
            </div>

            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-black font-mono text-cyan-400 shrink-0">
                  {formatDistance(state.distanceToNextStopMeters)}
                </span>
                <span className="text-xs font-semibold text-zinc-100 truncate">
                  {currentLeg.instruction}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 truncate">
                <span>Tujuan: {currentLeg.to?.name || 'Tujuan'}</span>
                <span>•</span>
                <span>Langkah {state.currentLegIndex + 1}/{state.legs.length}</span>
                {isAlarmArmed && (
                  <span className="text-amber-400 font-medium">
                    • ⏰ Alarm
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                replayCurrentInstruction();
              }}
              className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition cursor-pointer"
              title="Dengarkan Ulang Panduan Suara"
              aria-label="Replay voice guidance"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCenter();
              }}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                state.isCentered
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
              }`}
              title="Kunci Kamera"
              aria-label="Center GPS"
            >
              <Crosshair className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/25 transition cursor-pointer"
              title="Perbesar Tampilan Navigasi"
              aria-label="Expand navigation HUD"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#0b101b]/95 backdrop-blur-xl border border-cyan-500/25 rounded-2xl shadow-2xl p-4 text-white overflow-hidden relative">
          {/* Top bar: Mode indicator, Soundwave, & Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center shrink-0">
                {getLegIcon(currentLeg)}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                    {currentLeg.type === 'WALK'
                      ? 'Jalan Kaki'
                      : currentLeg.type === 'TRANSFER'
                      ? 'Pindah Peron'
                      : `${currentLeg.mode || 'TRANSIT'} ${currentLeg.lineName || ''}`}
                  </span>

                  {/* Soundwave Pulse Indicator */}
                  {isSpeaking && (
                    <div className="flex items-center gap-0.5 ml-1" title="Pemandu suara sedang berbicara">
                      <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1 h-4 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1 h-2.5 bg-cyan-400 rounded-full animate-bounce" />
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-zinc-400 truncate max-w-[150px] sm:max-w-[200px]">
                  Tujuan: {currentLeg.to?.name || 'Tujuan'}
                </div>
              </div>
            </div>

            {/* Action Control Buttons */}
            <div className="flex items-center gap-1">
              {/* Disembark Alarm Toggle */}
              <button
                type="button"
                onClick={toggleAlarm}
                className={`p-2 rounded-xl text-xs transition border cursor-pointer ${
                  isAlarmArmed
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
                title={isAlarmArmed ? 'Alarm Turun Aktif (Klik untuk matikan)' : 'Pasang Alarm Pengingat Turun'}
                aria-label="Toggle disembark alarm"
              >
                <Bell className="w-4 h-4" />
              </button>

              {/* Mute/Unmute Audio */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-2 rounded-xl text-xs transition border cursor-pointer ${
                  state.isMuted
                    ? 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/25'
                }`}
                title={state.isMuted ? 'Aktifkan Suara Navigasi' : 'Bisukan Suara'}
                aria-label={state.isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
              >
                {state.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Recenter GPS / Follow Camera */}
              <button
                type="button"
                onClick={toggleCenter}
                className={`p-2 rounded-xl text-xs transition border cursor-pointer ${
                  state.isCentered
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
                title={state.isCentered ? 'Kamera Mengikuti Lokasi Anda' : 'Kunci Kamera ke Lokasi GPS'}
                aria-label="Center GPS"
              >
                <Crosshair className="w-4 h-4" />
              </button>

              {/* Minimize Card */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-2 rounded-xl text-xs bg-zinc-800/80 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 transition cursor-pointer"
                title="Ciutkan Tampilan (Minimize)"
                aria-label="Minimize navigation card"
              >
                <ChevronUp className="w-4 h-4 text-cyan-400" />
              </button>

              {/* Stop Navigation */}
              <button
                type="button"
                onClick={handleStopNavigation}
                className="p-2 rounded-xl text-xs bg-rose-600/20 border border-rose-500/40 text-rose-400 hover:bg-rose-600/30 transition cursor-pointer"
                title="Akhiri Navigasi"
                aria-label="Stop navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero Active Instruction */}
          <div className="pt-3 pb-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm sm:text-base font-black text-white leading-snug tracking-tight">
                {currentLeg.instruction}
              </p>
              <button
                type="button"
                onClick={replayCurrentInstruction}
                className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition shrink-0 cursor-pointer"
                title="Dengarkan Ulang Panduan Suara Langkah Ini"
                aria-label="Replay current step instruction"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <div className="text-2xl font-black text-cyan-400 font-mono tracking-tight">
                {formatDistance(state.distanceToNextStopMeters)}
              </div>

              <div className="text-xs text-zinc-400 font-medium">
                Sisa ke stasiun/tujuan berikutnya
              </div>
            </div>
          </div>

          {/* Bottom Metrics Bar: Progress & Step counter */}
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5 font-medium">
              <NavigationIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Langkah {state.currentLegIndex + 1} dari {state.legs.length}
              </span>
            </div>

            <div className="font-mono text-zinc-300 flex items-center gap-2">
              {isAlarmArmed && (
                <span className="text-[10px] text-amber-400 font-sans font-semibold px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                  ⏰ Alarm Aktif
                </span>
              )}
              {state.status === 'arrived' ? (
                <span className="text-emerald-400 font-bold">Tiba di Tujuan</span>
              ) : (
                <span>Est. {currentLeg.durationMinutes} mnt</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Completed Steps Accordion */}
      {!isMinimized && completedLegs.length > 0 && (
        <div className="bg-[#0b101b]/90 backdrop-blur-md border border-zinc-800/80 rounded-xl overflow-hidden shadow-lg text-xs text-zinc-300">
          <button
            type="button"
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-zinc-800/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{completedLegs.length} langkah terlewati</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <span>{isHistoryOpen ? 'Tutup riwayat' : 'Buka riwayat'}</span>
              {isHistoryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {isHistoryOpen && (
            <div className="p-3 border-t border-zinc-800/60 divide-y divide-zinc-800/40 space-y-2 max-h-48 overflow-y-auto">
              {completedLegs.map((leg, idx) => (
                <div key={`comp_${leg.id}_${idx}`} className="pt-2 first:pt-0 flex items-start gap-2 text-[11px]">
                  <span className="text-emerald-500 font-mono text-[10px] mt-0.5">✓</span>
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-300 line-through opacity-75 truncate">
                      {leg.instruction}
                    </p>
                    <span className="text-[9.5px] text-zinc-500">
                      Menuju {leg.to?.name || 'tujuan'} • {formatDistance(leg.distanceMeters || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
