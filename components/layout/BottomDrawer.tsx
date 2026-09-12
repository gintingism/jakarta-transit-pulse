'use client';

import React from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import RouteFinder from '@/components/planner/RouteFinder';
import GeoAlarmPanel from '@/components/alarm/GeoAlarmPanel';
import {
  Navigation2,
  Bell,
  ChevronDown,
  ChevronUp,
  MapPin,
  ArrowRight,
  Maximize2,
  Minimize2,
  Linkedin,
  Github,
  Info,
  Coffee,
} from 'lucide-react';

export default function BottomDrawer() {
  const activeTab = useTransitStore((s) => s.activeTab);
  const setActiveTab = useTransitStore((s) => s.setActiveTab);
  const isDrawerExpanded = useTransitStore((s) => s.isDrawerExpanded);
  const toggleDrawer = useTransitStore((s) => s.toggleDrawer);
  const isAlarmArmed = useTransitStore((s) => s.isAlarmArmed);
  const routePlan = useTransitStore((s) => s.routePlan);
  const setAboutModalOpen = useTransitStore((s) => s.setAboutModalOpen);

  const handleTabClick = (tab: 'planner' | 'alarm') => {
    setActiveTab(tab);
    if (!isDrawerExpanded) {
      toggleDrawer();
    }
  };

  return (
    <div
      className={`fixed z-30 transition-all duration-300 ease-in-out bg-white dark:bg-zinc-900/95 backdrop-blur-xl border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col
        /* Mobile: Bottom Sheet */
        bottom-0 left-0 right-0 border-t rounded-t-2xl
        /* Desktop: Spacious Left Command Sidebar */
        md:top-20 md:left-4 md:right-auto md:w-[440px] lg:w-[460px] xl:w-[480px] md:border md:rounded-2xl
        ${
          isDrawerExpanded
            ? 'h-auto max-h-[85vh] md:bottom-4 md:max-h-[calc(100vh-96px)]'
            : 'h-[58px] max-h-[58px] overflow-hidden md:bottom-auto md:max-h-[58px]'
        }
      `}
    >
      {/* Drawer Grabber & Header Tabs */}
      <div
        onClick={!isDrawerExpanded ? toggleDrawer : undefined}
        className={`flex flex-col border-b border-slate-200 dark:border-zinc-800/80 p-2 sm:p-2.5 shrink-0 ${
          !isDrawerExpanded
            ? 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition select-none'
            : ''
        }`}
      >
        {/* Mobile drag handle */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleDrawer();
          }}
          className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400 dark:hover:bg-zinc-500 rounded-full mx-auto mb-2 md:hidden cursor-pointer"
        />

        {/* Header content when collapsed with an active route: concise mini route pill */}
        {!isDrawerExpanded && routePlan ? (
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 overflow-hidden text-xs flex-1">
              <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-[125px]">
                  {routePlan.originPlaceName || routePlan.origin.name}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-[125px]">
                  {routePlan.destinationPlaceName || routePlan.destination.name}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                Rp {routePlan.totalFareIdr.toLocaleString('id-ID')}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleDrawer();
              }}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition shrink-0 cursor-pointer shadow-xs active:scale-95"
              title="Perluas Panel Rute"
              aria-label="Perluas Panel Rute"
            >
              <span>Buka Rute</span>
              {/* Desktop Down Chevron / Mobile Up Chevron */}
              <ChevronDown className="w-3.5 h-3.5 hidden md:block" />
              <ChevronUp className="w-3.5 h-3.5 md:hidden" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1.5 w-full">
            {/* Navigation Tab Buttons */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 flex-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTabClick('planner');
                }}
                className={`flex-1 py-1.5 px-2 sm:px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === 'planner'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm border border-slate-200/80 dark:border-zinc-700/50'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <Navigation2 className="w-3.5 h-3.5 transform rotate-45 text-sky-500 dark:text-sky-400 shrink-0" />
                <span className="truncate">Rute</span>
              </button>

              <button
                id="tour-alarm-tab"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTabClick('alarm');
                }}
                className={`flex-1 py-1.5 px-2 sm:px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 sm:gap-1.5 relative ${
                  activeTab === 'alarm'
                    ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <Bell className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                <span className="truncate">Alarm</span>
                {isAlarmArmed && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
                )}
              </button>
            </div>

            {/* Desktop/Mobile Collapse Toggle Button with Intuitive Directional Chevron */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleDrawer();
              }}
              className="flex items-center gap-1 py-1.5 px-2.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-800 transition ml-0.5 cursor-pointer shrink-0 active:scale-95"
              title={
                isDrawerExpanded
                  ? 'Ciutkan Panel (Tampilkan Peta Penuh)'
                  : 'Perluas Panel Rute & Navigasi'
              }
              aria-label={isDrawerExpanded ? 'Ciutkan Panel' : 'Perluas Panel'}
            >
              <span className="hidden sm:inline text-[11px] font-semibold">
                {isDrawerExpanded ? 'Tutup' : 'Buka'}
              </span>

              {/* Mobile Chevron (Bottom Sheet: Down to close, Up to open) */}
              <span className="md:hidden">
                {isDrawerExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </span>

              {/* Desktop Chevron (Top Sidebar: Up to collapse, Down to expand) */}
              <span className="hidden md:inline-flex">
                {isDrawerExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Drawer Content Area (Scrollable) */}
      {isDrawerExpanded && (
        <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-4">
          {activeTab === 'planner' && <RouteFinder />}
          {activeTab === 'alarm' && <GeoAlarmPanel />}

          {/* Sleek Professional Drawer Footer */}
          <div className="pt-3 pb-1 border-t border-slate-200 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-2 text-center select-none">
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-zinc-400 font-medium flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setAboutModalOpen(true)}
                className="hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer flex items-center gap-1"
                aria-label="Buka profil pengembang dan informasi aplikasi"
              >
                <Info className="w-3.5 h-3.5 text-sky-500" />
                <span>Tentang Pengembang</span>
              </button>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <button
                type="button"
                onClick={() => setAboutModalOpen(true)}
                className="hover:text-amber-600 dark:hover:text-amber-400 text-amber-600 dark:text-amber-400 transition cursor-pointer flex items-center gap-1 font-semibold"
                aria-label="Dukung proyek via QRIS"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Donasi QRIS</span>
              </button>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <a
                href="https://www.linkedin.com/in/bonifasiustotoneguisaginting/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#0077b5] dark:hover:text-[#38bdf8] transition flex items-center gap-1"
                aria-label="Profil LinkedIn pengembang"
              >
                <Linkedin className="w-3.5 h-3.5 text-[#0077b5] fill-current" />
                <span>LinkedIn</span>
              </a>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <a
                href="https://github.com/gintingism/jakarta-transit-pulse"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1"
                aria-label="Repositori GitHub proyek"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub</span>
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 dark:text-zinc-500">
              <span>&copy; {new Date().getFullYear()} Jakarta Transit Pulse</span>
              <span className="hidden sm:inline">•</span>
              <span>Oleh <strong className="font-semibold text-slate-600 dark:text-zinc-400">Bonifasius Toto Neguisa Ginting</strong> (@gintingism)</span>
              <span className="hidden sm:inline">•</span>
              <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-[9px] text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">All Rights Reserved</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
