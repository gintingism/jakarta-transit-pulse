'use client';

import React from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import { STATION_MAP, TRANSIT_LINES, LineIdentifier } from '@/src/data/transitNetwork';
import { formatDistance, formatSpeed } from '@/src/lib/transitEngine';
import {
  Bell,
  Layers,
  ChevronRight,
  Compass,
  LocateFixed,
  Loader2,
  Info,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function FloatingHud() {
  const alarmTargetStopId = useTransitStore((s) => s.alarmTargetStopId);
  const isAlarmArmed = useTransitStore((s) => s.isAlarmArmed);
  const currentDistanceMeters = useTransitStore((s) => s.currentDistanceMeters);
  const selectedLineId = useTransitStore((s) => s.selectedLineId);
  const setSelectedLine = useTransitStore((s) => s.setSelectedLine);
  const setActiveTab = useTransitStore((s) => s.setActiveTab);
  const setDrawerExpanded = useTransitStore((s) => s.setDrawerExpanded);
  const isSimulatingApproach = useTransitStore((s) => s.isSimulatingApproach);
  const useCurrentLocationAsOrigin = useTransitStore((s) => s.useCurrentLocationAsOrigin);
  const userCoords = useTransitStore((s) => s.userCoords);
  const userSpeed = useTransitStore((s) => s.userSpeed);
  const isFollowUser = useTransitStore((s) => s.isFollowUser);
  const setIsFollowUser = useTransitStore((s) => s.setIsFollowUser);
  const setMapCenter = useTransitStore((s) => s.setMapCenter);
  const isLocating = useTransitStore((s) => s.isLocating);
  const setAboutModalOpen = useTransitStore((s) => s.setAboutModalOpen);

  const targetStation = alarmTargetStopId ? STATION_MAP[alarmTargetStopId] : null;

  const handleLocateMe = () => {
    if (userCoords) {
      setIsFollowUser(true);
      setMapCenter(userCoords, 16);
    } else {
      useCurrentLocationAsOrigin();
      setIsFollowUser(true);
    }
  };

  const handleAlarmPillClick = () => {
    setActiveTab('alarm');
    setDrawerExpanded(true);
  };

  return (
    <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
      {/* Brand Identity Cockpit Badge */}
      <div className="pointer-events-auto flex items-center gap-2.5 bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl px-3 py-2 shadow-xl hover:border-sky-500/40 transition">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 shadow-md shadow-sky-500/25 text-white shrink-0">
          <Compass className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white">
              Jakarta Transit Pulse
            </span>
            <span className="text-[9px] font-bold tracking-tight px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800/60 font-mono">
              a.k.a. AntiBablas
            </span>
            <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 rounded border border-sky-200 dark:border-sky-800/60 font-mono hidden sm:inline-block">
              JABODETABEK
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium hidden sm:inline-block">
            Radar Navigasi Multimoda & Alarm Anti-Bablas • KRL • TJ • Bandara
          </span>
        </div>
      </div>

      {/* Right Control Cluster */}
      <div className="pointer-events-auto flex items-center gap-2 ml-auto">
        {/* Active Alarm HUD Pill */}
        {isAlarmArmed && targetStation && (
          <button
            type="button"
            onClick={handleAlarmPillClick}
            className="bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md border border-rose-500/70 hover:border-rose-500 rounded-2xl pl-3 pr-3 py-1.5 shadow-xl flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
            title="Buka panel pengingat turun"
          >
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute" />
              <Bell className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 relative" />
            </div>

            <div className="text-left">
              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <span>Alarm Aktif</span>
                {isSimulatingApproach && (
                  <span className="text-[9px] bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1 rounded font-mono">
                    SIM
                  </span>
                )}
              </div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate max-w-[120px] sm:max-w-[160px]">
                {targetStation.name}
              </div>
            </div>

            <div className="pl-2 border-l border-slate-200 dark:border-zinc-800 flex items-center gap-1 text-xs font-mono font-semibold text-sky-600 dark:text-sky-400">
              {currentDistanceMeters !== null
                ? formatDistance(currentDistanceMeters)
                : 'Menghubungkan...'}
              <ChevronRight className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
            </div>
          </button>
        )}

        {/* Network & Corridor Filter Dropdown */}
        <div className="bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl px-3 py-2 shadow-xl flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
          <select
            value={selectedLineId}
            onChange={(e) =>
              setSelectedLine(e.target.value as LineIdentifier | 'ALL')
            }
            className="bg-transparent text-slate-800 dark:text-zinc-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[135px] sm:max-w-[175px] truncate"
            aria-label="Pilih koridor transit"
          >
            <option value="ALL" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
              Semua Koridor (5 Moda)
            </option>
            {Object.values(TRANSIT_LINES).map((line) => (
              <option
                key={line.id}
                value={line.id}
                className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
              >
                {line.name} ({line.shortName})
              </option>
            ))}
          </select>
        </div>

        {/* Real-time Moving Speedometer */}
        {userSpeed !== null && userSpeed >= 1.0 && (
          <div
            className="bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md border border-sky-300 dark:border-sky-800/80 rounded-2xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 text-xs font-mono font-bold text-sky-600 dark:text-sky-400"
            title="Kecepatan Gerak Real-Time"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{formatSpeed(userSpeed)}</span>
          </div>
        )}

        {/* Quick GPS Locate & Follow Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className={`p-2 sm:p-2.5 rounded-2xl border backdrop-blur-md shadow-xl transition cursor-pointer active:scale-95 flex items-center gap-1.5 ${
            isFollowUser
              ? 'bg-sky-50 dark:bg-sky-950/90 border-sky-500 text-sky-600 dark:text-sky-300 ring-2 ring-sky-400/40'
              : 'bg-white/95 dark:bg-zinc-900/90 border-slate-200/80 dark:border-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400'
          }`}
          title={
            isFollowUser
              ? 'Mode Ikuti Posisi Aktif (Peta bergerak otomatis mengikuti Anda)'
              : 'Pusatkan & Ikuti Posisi GPS Saya'
          }
          aria-label="Pusatkan dan Ikuti Posisi GPS Saya"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
          ) : (
            <LocateFixed
              className={`w-4 h-4 ${
                isFollowUser ? 'text-sky-500 animate-pulse' : 'text-sky-500'
              }`}
            />
          )}
          {isFollowUser && (
            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-300 hidden md:inline">
              Live Ikuti
            </span>
          )}
        </button>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* About Developer & App Info Modal Trigger */}
        <button
          type="button"
          onClick={() => setAboutModalOpen(true)}
          className="p-2 sm:p-2.5 rounded-2xl bg-white/95 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 backdrop-blur-md shadow-xl text-slate-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400 hover:scale-105 active:scale-95 transition cursor-pointer"
          title="Tentang Pengembang & Aplikasi"
          aria-label="Tentang Pengembang & Aplikasi"
        >
          <Info className="w-4 h-4 text-slate-600 dark:text-zinc-300 hover:text-sky-500" />
        </button>
      </div>
    </div>
  );
}
