'use client';

import React, { useState } from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import { SavedPlace } from '@/src/lib/savedPlacesService';
import {
  Home,
  Briefcase,
  Star,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  ArrowRight,
  Sparkles,
  MapPin,
  Check,
} from 'lucide-react';

export default function QuickShortcuts() {
  const savedPlaces = useTransitStore((s) => s.savedPlaces);
  const savedRoutes = useTransitStore((s) => s.savedRoutes);
  const openSetPlaceModal = useTransitStore((s) => s.openSetPlaceModal);
  const applySavedPlaceAsDestination = useTransitStore((s) => s.applySavedPlaceAsDestination);
  const applySavedRoute = useTransitStore((s) => s.applySavedRoute);
  const removeSavedRoute = useTransitStore((s) => s.removeSavedRoute);

  const [isRoutesExpanded, setIsRoutesExpanded] = useState(false);
  const [appliedRouteId, setAppliedRouteId] = useState<string | null>(null);

  const homePlace = savedPlaces.find((p) => p.type === 'home');
  const workPlace = savedPlaces.find((p) => p.type === 'work');

  const handleApplyRoute = (routeId: string) => {
    const targetRoute = savedRoutes.find((r) => r.id === routeId);
    if (!targetRoute) return;
    applySavedRoute(targetRoute);
    setAppliedRouteId(routeId);
    setTimeout(() => {
      setAppliedRouteId(null);
      setIsRoutesExpanded(false);
    }, 600);
  };

  return (
    <div className="space-y-2 mb-3">
      {/* Primary Commuter Shortcuts Row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Rumah Shortcut */}
        {homePlace ? (
          <div className="inline-flex items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs overflow-hidden transition hover:border-emerald-300 dark:hover:border-emerald-700">
            <button
              type="button"
              onClick={() => applySavedPlaceAsDestination(homePlace)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-left text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition text-xs font-semibold cursor-pointer active:scale-98"
              title={`Arahkan rute ke ${homePlace.target.name}`}
            >
              <Home className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px] shrink-0">Rumah:</span>
              <span className="truncate max-w-[95px] sm:max-w-[130px]">
                {homePlace.target.name}
              </span>
            </button>
            <button
              type="button"
              onClick={() => openSetPlaceModal('home')}
              className="min-w-[32px] min-h-[32px] flex items-center justify-center p-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 border-l border-emerald-200/80 dark:border-emerald-800/60 transition cursor-pointer"
              title="Ubah lokasi rumah"
              aria-label="Ubah lokasi rumah"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openSetPlaceModal('home')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-dashed border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition text-xs font-medium cursor-pointer shadow-xs active:scale-98"
          >
            <Home className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>+ Set Rumah</span>
          </button>
        )}

        {/* Kantor Shortcut */}
        {workPlace ? (
          <div className="inline-flex items-center rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 shadow-xs overflow-hidden transition hover:border-sky-300 dark:hover:border-sky-700">
            <button
              type="button"
              onClick={() => applySavedPlaceAsDestination(workPlace)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-left text-sky-800 dark:text-sky-300 hover:bg-sky-100/50 dark:hover:bg-sky-900/30 transition text-xs font-semibold cursor-pointer active:scale-98"
              title={`Arahkan rute ke ${workPlace.target.name}`}
            >
              <Briefcase className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="font-bold text-sky-700 dark:text-sky-400 text-[11px] shrink-0">Kantor:</span>
              <span className="truncate max-w-[95px] sm:max-w-[130px]">
                {workPlace.target.name}
              </span>
            </button>
            <button
              type="button"
              onClick={() => openSetPlaceModal('work')}
              className="min-w-[32px] min-h-[32px] flex items-center justify-center p-1.5 text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 hover:bg-sky-100/70 dark:hover:bg-sky-900/50 border-l border-sky-200/80 dark:border-sky-800/60 transition cursor-pointer"
              title="Ubah lokasi kantor"
              aria-label="Ubah lokasi kantor"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openSetPlaceModal('work')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-dashed border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition text-xs font-medium cursor-pointer shadow-xs active:scale-98"
          >
            <Briefcase className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>+ Set Kantor</span>
          </button>
        )}

        {/* Saved Routes Toggle Button (Visible when routes exist) */}
        {savedRoutes.length > 0 && (
          <button
            type="button"
            onClick={() => setIsRoutesExpanded((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition text-xs font-semibold cursor-pointer shadow-xs active:scale-98 ml-auto ${
              isRoutesExpanded
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300'
                : 'bg-amber-50/80 dark:bg-zinc-900 hover:bg-amber-100/60 dark:hover:bg-zinc-800 border-amber-200/80 dark:border-zinc-700 text-amber-800 dark:text-amber-400'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            <span>Favorit ({savedRoutes.length})</span>
            {isRoutesExpanded ? (
              <ChevronUp className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            )}
          </button>
        )}
      </div>

      {/* Expandable Saved Routes Panel */}
      {isRoutesExpanded && savedRoutes.length > 0 && (
        <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-inner space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800/80 pb-1.5">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              Rute Favorit Tersimpan (1-Tap Komuter)
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-500">
              {savedRoutes.length} dari maks 10
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {savedRoutes.map((r) => {
              const isApplied = appliedRouteId === r.id;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                        {r.name}
                      </span>
                      {r.preference && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 shrink-0">
                          {r.preference === 'FASTEST'
                            ? 'Tercepat'
                            : r.preference === 'CHEAPEST'
                            ? 'Termurah'
                            : 'Min. Transit'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                      <span className="truncate max-w-[120px]">{r.origin.name}</span>
                      <ArrowRight className="w-2.5 h-2.5 shrink-0 text-slate-400 dark:text-zinc-600" />
                      <span className="truncate max-w-[120px]">{r.destination.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApplyRoute(r.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                        isApplied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white shadow-xs'
                      }`}
                      title="Gunakan rute ini sekarang"
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Dipakai!</span>
                        </>
                      ) : (
                        <span>Pakai</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeSavedRoute(r.id)}
                      className="p-1 rounded-md text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title="Hapus dari favorit"
                      aria-label={`Hapus rute ${r.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
