'use client';

import React from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import { STATION_MAP, TRANSIT_LINES, LineIdentifier } from '@/src/data/transitNetwork';
import { formatDistance, formatSpeed } from '@/src/lib/transitEngine';
import { APP_VERSION } from '@/src/data/changelog';
import {
  Bell,
  Layers,
  ChevronRight,
  LocateFixed,
  Loader2,
  Info,
  HelpCircle,
  Sparkles,
  MessageSquarePlus,
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
  const openTour = useTransitStore((s) => s.openTour);
  const setChangelogModalOpen = useTransitStore((s) => s.setChangelogModalOpen);
  const setFeedbackModalOpen = useTransitStore((s) => s.setFeedbackModalOpen);
  const hasUnreadChangelog = useTransitStore((s) => s.hasUnreadChangelog);

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
      <div className="pointer-events-auto flex items-center gap-2 backdrop-blur-md bg-white/85 dark:bg-zinc-900/85 border border-slate-200/60 dark:border-zinc-800/60 shadow-sm rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 hover:border-sky-500/40 transition">
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden bg-white border border-slate-200/90 dark:border-zinc-700 shadow-sm p-0.5 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Jakarta Transit Pulse Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none z-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white truncate max-w-[125px] sm:max-w-none">
            Jakarta Transit Pulse
          </span>
          <button
            type="button"
            onClick={() => setChangelogModalOpen(true)}
            className="relative text-[9px] sm:text-[9.5px] font-bold tracking-tight px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 rounded-md border border-sky-200 dark:border-sky-800/60 font-mono hover:bg-sky-200 dark:hover:bg-sky-900 transition cursor-pointer shrink-0"
            title="Lihat Log Pembaruan Versi"
            aria-label={`Versi ${APP_VERSION}`}
          >
            <span>{APP_VERSION}</span>
            {hasUnreadChangelog && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Right Control Cluster */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2 ml-auto justify-end">
        {/* Active Alarm HUD Pill */}
        {isAlarmArmed && targetStation && (
          <button
            type="button"
            onClick={handleAlarmPillClick}
            className="backdrop-blur-md bg-white/85 dark:bg-zinc-900/85 border border-rose-500/70 hover:border-rose-500 rounded-2xl pl-3 pr-3 py-1.5 shadow-sm flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
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

            <div className="pl-2 border-l border-slate-200 dark:border-zinc-800 flex items-center gap-1 text-xs font-mono font-semibold tabular-nums text-sky-600 dark:text-sky-400">
              {currentDistanceMeters !== null
                ? formatDistance(currentDistanceMeters)
                : 'Menghubungkan...'}
              <ChevronRight className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
            </div>
          </button>
        )}

        {/* Network & Corridor Filter Dropdown */}
        <div className="backdrop-blur-md bg-white/85 dark:bg-zinc-900/85 border border-slate-200/60 dark:border-zinc-800/60 shadow-sm rounded-2xl px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <Layers className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
            {selectedLineId === 'ALL' ? (
              <span
                className="w-2 h-2 rounded-full bg-gradient-to-r from-sky-500 via-rose-500 to-amber-500 shrink-0"
                title="Semua Koridor (5 Moda)"
              />
            ) : (
              <span
                className="w-2 h-2 rounded-full shrink-0 shadow-xs transition-colors"
                style={{
                  backgroundColor:
                    TRANSIT_LINES[selectedLineId as LineIdentifier]?.color || '#0ea5e9',
                }}
                title={`Koridor: ${TRANSIT_LINES[selectedLineId as LineIdentifier]?.name || selectedLineId}`}
              />
            )}
          </div>
          <select
            value={selectedLineId}
            onChange={(e) =>
              setSelectedLine(e.target.value as LineIdentifier | 'ALL')
            }
            className="bg-transparent text-slate-800 dark:text-zinc-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[110px] sm:max-w-[175px] truncate"
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
            className="backdrop-blur-md bg-white/85 dark:bg-zinc-900/85 border border-sky-300 dark:border-sky-800/80 rounded-2xl px-2.5 py-1.5 shadow-sm flex items-center gap-1.5 text-xs font-mono font-bold tabular-nums text-sky-600 dark:text-sky-400"
            title="Kecepatan Gerak Real-Time"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{formatSpeed(userSpeed)}</span>
          </div>
        )}

        {/* Quick GPS Locate & Follow Button */}
        <button
          id="tour-recenter-btn"
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className={`p-2 sm:p-2.5 rounded-2xl border backdrop-blur-md shadow-sm transition cursor-pointer active:scale-95 flex items-center gap-1.5 ${
            isFollowUser
              ? 'bg-sky-50 dark:bg-sky-950/90 border-sky-500 text-sky-600 dark:text-sky-300 ring-2 ring-sky-400/40'
              : 'bg-white/85 dark:bg-zinc-900/85 border-slate-200/60 dark:border-zinc-800/60 text-slate-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400'
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

        {/* Changelog & Updates Modal Trigger */}
        <button
          type="button"
          onClick={() => setChangelogModalOpen(true)}
          className="relative p-2 sm:p-2.5 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-zinc-900/85 border border-slate-200/60 dark:border-zinc-800/60 shadow-sm text-slate-700 dark:text-zinc-300 hover:text-amber-500 dark:hover:text-amber-400 hover:scale-105 active:scale-95 transition cursor-pointer hidden sm:flex items-center justify-center"
          title="Apa yang Baru (Log Pembaruan Versi)"
          aria-label="Log Pembaruan Versi"
        >
          <Sparkles className="w-4 h-4" />
          {hasUnreadChangelog && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
          )}
        </button>

        {/* User Feedback Form Trigger */}
        <button
          type="button"
          onClick={() => setFeedbackModalOpen(true)}
          className="p-2 sm:p-2.5 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-zinc-900/85 border border-slate-200/60 dark:border-zinc-800/60 shadow-sm text-slate-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:scale-105 active:scale-95 transition cursor-pointer hidden sm:flex items-center justify-center"
          title="Beri Masukan & Lapor Kendala"
          aria-label="Beri Masukan & Lapor Kendala"
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>

        {/* Tour Guide Help Button */}
        <button
          type="button"
          onClick={openTour}
          className="p-2 sm:p-2.5 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-zinc-900/85 border border-slate-200/60 dark:border-zinc-800/60 shadow-sm text-slate-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400 hover:scale-105 active:scale-95 transition cursor-pointer hidden sm:flex items-center justify-center"
          title="Panduan Penggunaan Aplikasi"
          aria-label="Panduan Penggunaan Aplikasi"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* About Developer & App Info Modal Trigger */}
        <button
          type="button"
          onClick={() => setAboutModalOpen(true)}
          className="relative p-2 sm:p-2.5 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-zinc-900/85 border border-slate-200/60 dark:border-zinc-800/60 shadow-sm text-slate-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400 hover:scale-105 active:scale-95 transition cursor-pointer hidden sm:flex items-center justify-center"
          title="Tentang Pengembang & Aplikasi"
          aria-label="Tentang Pengembang & Aplikasi"
        >
          <Info className="w-4 h-4 text-slate-600 dark:text-zinc-300 hover:text-sky-500" />
          {hasUnreadChangelog && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
