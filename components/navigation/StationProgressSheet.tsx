'use client';

import React, { useState, useMemo } from 'react';
import {
  RouteLeg,
  NavigationTransitMode,
} from '@/src/types/navigation';
import {
  computeStationProgress,
  StationProgressItem,
} from '@/src/lib/stationProgress';
import { useTransitStore } from '@/stores/useTransitStore';
import {
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  MapPin,
  Bell,
  BellRing,
  ArrowRightLeft,
  Flag,
  Train,
  Bus,
  Footprints,
  Navigation as NavigationIcon,
} from 'lucide-react';

export interface StationProgressSheetProps {
  legs: RouteLeg[];
  currentLegIndex: number;
  userPos: { lat: number; lng: number } | null;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onStationClick?: (station: StationProgressItem) => void;
}

export default function StationProgressSheet({
  legs,
  currentLegIndex,
  userPos,
  isOpen,
  onToggleOpen,
  onStationClick,
}: StationProgressSheetProps) {
  const [showAllPassed, setShowAllPassed] = useState(false);

  const storeIsOpen = useTransitStore((s) => s.isStationProgressOpen);
  const storeToggle = useTransitStore((s) => s.toggleStationProgress);

  const isSheetOpen = isOpen !== undefined ? isOpen : storeIsOpen;
  const handleToggle = onToggleOpen || storeToggle;

  const isAlarmArmed = useTransitStore((s) => s.isAlarmArmed);
  const alarmTargetStopId = useTransitStore((s) => s.alarmTargetStopId);
  const armAlarm = useTransitStore((s) => s.armAlarm);
  const disarmAlarm = useTransitStore((s) => s.disarmAlarm);
  const setMapCenter = useTransitStore((s) => s.setMapCenter);

  const progress = useMemo(
    () => computeStationProgress({ legs, currentLegIndex, userPos }),
    [legs, currentLegIndex, userPos]
  );

  const activeLeg = legs[currentLegIndex] || legs[0];

  const handleStationSelect = (station: StationProgressItem) => {
    setMapCenter(station.coords, 16);
    onStationClick?.(station);
  };

  const handleToggleAlarm = (stationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAlarmArmed && alarmTargetStopId === stationId) {
      disarmAlarm();
    } else {
      armAlarm(stationId);
    }
  };

  if (!legs || legs.length === 0 || progress.items.length === 0) {
    return null;
  }

  const formatDistance = (meters: number | null) => {
    if (meters === null) return null;
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const estimateMinutes = (meters: number | null, mode?: NavigationTransitMode, legType?: string) => {
    if (meters === null) return null;
    // Estimated average speed: KRL/MRT ~45 km/h (750 m/min), TJ ~25 km/h (416 m/min), Walk ~5 km/h (83 m/min)
    const speedMpm = mode === 'TJ' ? 416 : legType === 'WALK' ? 83 : 750;
    const mins = Math.max(1, Math.round(meters / speedMpm));
    return `~${mins} mnt`;
  };

  const getModeIcon = (mode?: NavigationTransitMode, legType?: string) => {
    if (legType === 'WALK') return <Footprints className="w-3.5 h-3.5 text-emerald-400" />;
    if (legType === 'TRANSFER') return <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />;
    if (mode === 'TJ') return <Bus className="w-3.5 h-3.5 text-rose-400" />;
    return <Train className="w-3.5 h-3.5 text-sky-400" />;
  };

  const currentStation = progress.currentStation;
  const passedStations = progress.items.filter((st) => st.status === 'passed');
  const shouldCollapsePassed = passedStations.length > 2 && !showAllPassed;

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-6 sm:right-auto sm:w-[440px] z-30 font-sans select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      {isSheetOpen ? (
        /* EXPANDED TIMELINE DRAWER */
        <div className="bg-[#0b101b]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[70vh] ring-1 ring-cyan-500/20">
          {/* Drag Handle & Header */}
          <div
            onClick={handleToggle}
            className="p-3.5 pb-2.5 border-b border-zinc-800/80 cursor-pointer hover:bg-zinc-900/40 transition"
          >
            <div className="w-10 h-1 rounded-full bg-zinc-600/80 mx-auto mb-2" />

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                    <NavigationIcon className="w-4 h-4 text-cyan-400" />
                    <span>Progress Rute & Daftar Stasiun</span>
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                  <span className="tabular-nums font-semibold text-zinc-200">
                    {progress.totalStations} Stasiun
                  </span>
                  <span>•</span>
                  <span className="tabular-nums text-emerald-400 font-medium">
                    {progress.passedCount} Terlewati
                  </span>
                  <span>•</span>
                  <span className="tabular-nums text-cyan-400 font-medium">
                    {progress.remainingCount} Tersisa
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
                className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer border border-zinc-700"
                title="Ciutkan Daftar Stasiun"
                aria-label="Collapse station list"
              >
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            {/* Overall Progress Bar */}
            <div className="mt-2.5 h-1.5 rounded-full bg-zinc-800/90 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 transition-all duration-500 rounded-full"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Timeline Station List */}
          <div className="p-3.5 overflow-y-auto space-y-1 divide-y divide-transparent">
            {/* Collapsed passed stations notice */}
            {shouldCollapsePassed && (
              <button
                type="button"
                onClick={() => setShowAllPassed(true)}
                className="w-full py-2 px-3 mb-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{passedStations.length} stasiun sebelumnya telah dilewati</span>
                </div>
                <span className="text-[10px] text-cyan-400 underline underline-offset-2">
                  Tampilkan
                </span>
              </button>
            )}

            {/* Render stations */}
            {progress.items.map((station, idx) => {
              const isPassed = station.status === 'passed';
              const isCurrent = station.status === 'current';
              const isUpcoming = station.status === 'upcoming';
              const isAlarmOnThis = isAlarmArmed && alarmTargetStopId === station.id;

              // Hide passed stations if collapsed
              if (shouldCollapsePassed && isPassed) {
                return null;
              }

              return (
                <div
                  key={`st_prog_${station.id}_${idx}`}
                  onClick={() => handleStationSelect(station)}
                  className={`relative flex items-start gap-3 p-2.5 rounded-xl transition cursor-pointer group ${
                    isCurrent
                      ? 'bg-gradient-to-r from-cyan-950/70 via-blue-950/60 to-zinc-900/70 border border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-500/20 my-1'
                      : isPassed
                      ? 'hover:bg-zinc-900/40 opacity-70'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  {/* Left Column: Timeline Indicator */}
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    {isPassed ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    ) : isCurrent ? (
                      <div className="relative flex items-center justify-center w-5 h-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-400 border-2 border-zinc-950 shadow-md shadow-cyan-400/50" />
                      </div>
                    ) : (
                      <div
                        className="w-4 h-4 rounded-full border-2 border-zinc-500 bg-zinc-900 flex items-center justify-center group-hover:border-cyan-400 transition"
                        style={{
                          borderColor: station.lineColor || undefined,
                        }}
                      />
                    )}

                    {/* Connecting vertical line */}
                    {idx < progress.items.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 min-h-[22px] mt-1 ${
                          isPassed ? 'bg-emerald-500/30' : 'bg-zinc-800'
                        }`}
                      />
                    )}
                  </div>

                  {/* Middle Column: Station Information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs ${
                          isCurrent
                            ? 'font-black text-white text-sm tracking-tight'
                            : isPassed
                            ? 'font-medium text-zinc-400 line-through'
                            : 'font-semibold text-zinc-200'
                        }`}
                      >
                        {station.name}
                      </span>

                      {/* Station Badges */}
                      {isCurrent && (
                        <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                          {station.distanceToUserMeters !== null && station.distanceToUserMeters <= 80
                            ? 'Saat Ini di Sini'
                            : 'Stasiun Berikutnya'}
                        </span>
                      )}

                      {station.isOrigin && !isCurrent && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                          Awal
                        </span>
                      )}

                      {station.isDestination && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center gap-1">
                          <Flag className="w-2.5 h-2.5 text-rose-400" />
                          Tujuan Akhir
                        </span>
                      )}

                      {station.isTransfer && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                          <ArrowRightLeft className="w-2.5 h-2.5 text-amber-400" />
                          Transit: {station.transferToLineName || 'Lin Lain'}
                        </span>
                      )}
                    </div>

                    {/* Subtext: Line info & Distance/ETA */}
                    <div className="flex items-center gap-2 text-[10.5px] text-zinc-400 mt-0.5">
                      {station.lineName && (
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          {getModeIcon(station.mode, station.legType)}
                          <span style={{ color: station.lineColor || undefined }}>
                            {station.lineName}
                          </span>
                        </span>
                      )}

                      {isCurrent && station.distanceToUserMeters !== null && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-300 font-mono tabular-nums font-semibold">
                            {formatDistance(station.distanceToUserMeters)}
                          </span>
                          <span>•</span>
                          <span className="text-zinc-300">
                            {estimateMinutes(station.distanceToUserMeters, station.mode, station.legType)}
                          </span>
                        </>
                      )}

                      {isUpcoming && station.distanceToUserMeters !== null && (
                        <>
                          <span>•</span>
                          <span className="font-mono tabular-nums text-zinc-400">
                            {formatDistance(station.distanceToUserMeters)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column: 1-Tap Alarm Button */}
                  <div className="shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleToggleAlarm(station.id, e)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        isAlarmOnThis
                          ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-sm shadow-amber-500/20'
                          : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                      }`}
                      title={
                        isAlarmOnThis
                          ? 'Alarm aktif di stasiun ini (Klik untuk matikan)'
                          : `Pasang alarm pengingat di ${station.name}`
                      }
                      aria-label={`Toggle alarm for ${station.name}`}
                    >
                      {isAlarmOnThis ? (
                        <BellRing className="w-3.5 h-3.5 animate-bounce" />
                      ) : (
                        <Bell className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom quick toggle */}
          <div className="p-2 border-t border-zinc-800/80 text-center bg-[#070b13]">
            <button
              type="button"
              onClick={handleToggle}
              className="text-[11px] text-zinc-400 hover:text-white transition flex items-center justify-center gap-1 w-full py-1 cursor-pointer"
            >
              <span>Tutup Daftar Stasiun</span>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>
      ) : (
        /* PEEK VIEW (COLLAPSED FLOATING CARD) */
        <div
          onClick={handleToggle}
          className="bg-[#0b101b]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl p-3 text-white flex items-center justify-between gap-3 cursor-pointer hover:border-cyan-400/60 transition select-none ring-1 ring-cyan-500/15"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Pulsing Station Beacon */}
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 shrink-0">
              <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-cyan-400 opacity-60" />
              <MapPin className="w-4 h-4 text-cyan-400 relative z-10" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                  {currentStation?.status === 'current' &&
                  currentStation.distanceToUserMeters !== null &&
                  currentStation.distanceToUserMeters <= 80
                    ? 'Saat Ini di:'
                    : 'Stasiun Berikutnya:'}
                </span>
                {activeLeg.lineName && (
                  <span
                    className="text-[9.5px] px-1 py-0.2 rounded font-semibold truncate max-w-[120px]"
                    style={{
                      backgroundColor: `${activeLeg.lineColor || '#0284c7'}25`,
                      color: activeLeg.lineColor || '#38bdf8',
                    }}
                  >
                    {activeLeg.lineName}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-sm font-bold text-white truncate">
                  {currentStation?.name || 'Stasiun Rute'}
                </span>
                {currentStation?.distanceToUserMeters !== null && (
                  <span className="text-xs font-mono font-bold text-cyan-300 shrink-0 tabular-nums">
                    {formatDistance(currentStation?.distanceToUserMeters ?? null)}
                  </span>
                )}
              </div>

              {/* Mini progress bar */}
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                <div className="w-24 h-1 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progressPercent}%` }}
                  />
                </div>
                <span className="tabular-nums">
                  {progress.passedCount + 1}/{progress.totalStations} Stasiun
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 font-bold text-xs transition cursor-pointer"
              title="Buka Daftar Stasiun Lengkap"
              aria-label="Open station progress timeline"
            >
              <span>Daftar Stasiun</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
