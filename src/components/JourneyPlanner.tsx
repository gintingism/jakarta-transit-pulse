'use client';

import React, { useState } from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import StationCombobox from '@/components/planner/StationCombobox';
import {
  calculateHaversineDistance,
  formatDistance,
} from '@/src/lib/transitEngine';
import {
  Navigation,
  ArrowUpDown,
  Zap,
  DollarSign,
  Shuffle,
  CreditCard,
  Train,
  Bus,
  Plane,
  Clock,
  MapPin,
  Info,
  CheckCircle2,
  Bell,
  Footprints,
  AlertCircle,
} from 'lucide-react';

const POPULAR_DESTINATIONS = [
  {
    name: 'Bandara Soekarno-Hatta (SHIA)',
    coords: [-6.12748, 106.65179] as [number, number],
    stationId: 'ka_bandara_shia',
    badge: 'KAI Bandara',
  },
  {
    name: 'Monumen Nasional (Monas)',
    coords: [-6.1754, 106.8272] as [number, number],
    stationId: 'tj_monas',
    badge: 'TransJakarta',
  },
  {
    name: 'Stasiun Manggarai',
    coords: [-6.2099, 106.8502] as [number, number],
    stationId: 'krl_manggarai',
    badge: 'Hub KRL / Bandara',
  },
  {
    name: 'Stasiun Gambir',
    coords: [-6.1767, 106.8306] as [number, number],
    stationId: 'tj_gambir2',
    badge: 'KRL / TJ',
  },
  {
    name: 'Blok M Hub',
    coords: [-6.2444, 106.7981] as [number, number],
    stationId: 'mrt_blokm',
    badge: 'MRT / TJ',
  },
];

export default function JourneyPlanner() {
  const originStopId = useTransitStore((s) => s.originStopId);
  const destinationStopId = useTransitStore((s) => s.destinationStopId);
  const originPlace = useTransitStore((s) => s.originPlace);
  const destinationPlace = useTransitStore((s) => s.destinationPlace);
  const setOriginStop = useTransitStore((s) => s.setOriginStop);
  const setDestinationStop = useTransitStore((s) => s.setDestinationStop);
  const setOriginPlace = useTransitStore((s) => s.setOriginPlace);
  const setDestinationPlace = useTransitStore((s) => s.setDestinationPlace);
  const useCurrentLocationAsOrigin = useTransitStore((s) => s.useCurrentLocationAsOrigin);
  const swapStops = useTransitStore((s) => s.swapStops);
  const routePlan = useTransitStore((s) => s.routePlan);
  const isRoutingLoading = useTransitStore((s) => s.isRoutingLoading);
  const routePreference = useTransitStore((s) => s.routePreference);
  const setRoutePreference = useTransitStore((s) => s.setRoutePreference);
  const isAlarmArmed = useTransitStore((s) => s.isAlarmArmed);
  const armAlarm = useTransitStore((s) => s.armAlarm);

  const [showFareDetail, setShowFareDetail] = useState(true);

  return (
    <div className="space-y-4">
      {/* Input Form & Quick Pickers */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-500 transform rotate-45" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Perencana Perjalanan & Tarif
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 font-medium">
            Resmi KRL • TJ • Bandara
          </span>
        </div>

        {/* Origin & Destination Inputs with Swap Button */}
        <div className="relative space-y-2.5">
          <StationCombobox
            label="Titik Keberangkatan (Asal)"
            selectedStationId={originStopId}
            selectedPlace={originPlace}
            onSelect={setOriginStop}
            onSelectPlace={setOriginPlace}
            onUseCurrentLocation={useCurrentLocationAsOrigin}
            placeholder="Cari stasiun asal atau gunakan GPS..."
            dotColor="bg-emerald-500"
          />

          <div className="absolute right-3 top-[52px] z-10 -translate-y-1/2">
            <button
              type="button"
              onClick={swapStops}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 shadow-sm transition active:scale-90"
              title="Tukar Asal dan Tujuan"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <StationCombobox
            label="Titik Kedatangan (Tujuan)"
            selectedStationId={destinationStopId}
            selectedPlace={destinationPlace}
            onSelect={setDestinationStop}
            onSelectPlace={setDestinationPlace}
            placeholder="Cari stasiun tujuan atau tempat..."
            dotColor="bg-sky-500"
          />
        </div>

        {/* Route Preferences Selector */}
        <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-zinc-800">
          <label className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-1.5 font-medium">
            Prioritas Rute Perjalanan:
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={() => setRoutePreference('FASTEST')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                routePreference === 'FASTEST'
                  ? 'bg-white dark:bg-zinc-800 text-sky-700 dark:text-sky-300 shadow-sm border border-slate-200 dark:border-zinc-700/60'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Tercepat</span>
            </button>

            <button
              type="button"
              onClick={() => setRoutePreference('CHEAPEST')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                routePreference === 'CHEAPEST'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 shadow-sm border border-slate-200 dark:border-zinc-700/60'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>Termurah</span>
            </button>

            <button
              type="button"
              onClick={() => setRoutePreference('FEWEST_TRANSFERS')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                routePreference === 'FEWEST_TRANSFERS'
                  ? 'bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-300 shadow-sm border border-slate-200 dark:border-zinc-700/60'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Shuffle className="w-3 h-3" />
              <span>Transit Minim</span>
            </button>
          </div>
        </div>

        {/* 1-Tap Quick Destinations */}
        <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-zinc-800">
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-1.5 font-medium">
            Destinasi Populer Cepat (1-Tap):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_DESTINATIONS.map((dest) => {
              const isSelected =
                destinationPlace?.name === dest.name ||
                destinationStopId === dest.stationId;

              return (
                <button
                  key={`quick_dest_${dest.name}`}
                  type="button"
                  onClick={() =>
                    setDestinationPlace({
                      name: dest.name,
                      coords: dest.coords,
                      stationId: dest.stationId,
                    })
                  }
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-400 dark:border-sky-600 text-sky-800 dark:text-sky-200 font-semibold'
                      : 'bg-slate-50 dark:bg-zinc-950/60 hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-sky-500 shrink-0" />
                  <span>{dest.name}</span>
                  <span className="text-[9px] font-mono opacity-60">({dest.badge})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {isRoutingLoading && (
        <div className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center gap-3 text-xs text-slate-600 dark:text-zinc-400 shadow-sm animate-pulse">
          <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Mengkalkulasi rute transit tercepat & tarif resmi...</span>
        </div>
      )}

      {/* Route Result Card with Strict Official Fare Breakdown */}
      {routePlan && !isRoutingLoading && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xl space-y-4 animate-fade-in">
          {/* Header Summary */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-700 dark:text-sky-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                  ~{routePlan.totalDurationMinutes} Menit
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                  {routePlan.totalDistanceKm} km • {routePlan.segments.length === 1 ? 'Langsung' : `${routePlan.segments.length - 1}x Transit`}
                </div>
              </div>
            </div>

            {/* Total Fare Tag */}
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CreditCard className="w-4 h-4" />
                <span>Rp {routePlan.totalFareIdr.toLocaleString('id-ID')}</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Total Tarif Resmi
              </div>
            </div>
          </div>

          {/* Official Fare Breakdown Module */}
          <div className="bg-slate-50 dark:bg-zinc-950 rounded-xl p-3.5 border border-slate-200 dark:border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-500" />
                Rincian Tarif Resmi Per Moda:
              </span>
              <button
                type="button"
                onClick={() => setShowFareDetail(!showFareDetail)}
                className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
              >
                {showFareDetail ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>

            {showFareDetail && (
              <div className="space-y-2 mt-2 pt-2 border-t border-slate-200 dark:border-zinc-800/60">
                {routePlan.fareBreakdown && routePlan.fareBreakdown.length > 0 ? (
                  routePlan.fareBreakdown.map((item, idx) => (
                    <div
                      key={`breakdown_${idx}`}
                      className="flex items-center justify-between text-xs py-1 px-1.5 rounded bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/50"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {item.mode === 'kai-bandara' ? (
                          <Plane className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        ) : item.mode === 'krl' ? (
                          <Train className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        ) : item.mode === 'tj' ? (
                          <Bus className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : item.mode === 'mrt' ? (
                          <Train className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <Train className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                        <span className="truncate text-slate-700 dark:text-zinc-300">
                          {item.description}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100 shrink-0">
                        Rp {item.fare.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))
                ) : (
                  routePlan.segments.map((seg, idx) => (
                    <div
                      key={`seg_fare_${idx}`}
                      className="flex items-center justify-between text-xs py-1 px-1.5 rounded bg-white dark:bg-zinc-900"
                    >
                      <span className="truncate text-slate-700 dark:text-zinc-300">
                        {seg.lineName} ({seg.distanceKm} km)
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">
                        Rp {seg.fareIdr.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))
                )}

                <div className="text-[10px] text-slate-500 dark:text-zinc-500 pt-1 leading-snug">
                  * Tarif KRL: Rp 3.000 (25 km pertama) + Rp 1.000 per 10 km berikutnya. TransJakarta: Rp 3.500 (Rp 2.000 promo 05-07 WIB). KAI Bandara: Sesuai tabel relasi resmi PT Railink.
                </div>
              </div>
            )}
          </div>

          {/* Step-by-Step Directions */}
          <div className="space-y-2.5">
            {/* First-Mile Walk */}
            {routePlan.firstMileWalk && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs">
                <Footprints className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-zinc-100">
                    Jalan Kaki ke Stasiun Awal (~{routePlan.firstMileWalk.durationMinutes} mnt • {formatDistance(routePlan.firstMileWalk.distanceMeters)})
                  </div>
                  <div className="text-slate-600 dark:text-zinc-400 mt-0.5">
                    {routePlan.firstMileWalk.instruction}
                  </div>
                </div>
              </div>
            )}

            {/* Transit Segments */}
            {routePlan.segments.map((seg, i) => (
              <div
                key={`planner_seg_${i}`}
                className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-bold px-2 py-0.5 rounded text-[10px] uppercase text-white shadow-xs"
                    style={{ backgroundColor: seg.lineColor }}
                  >
                    {seg.lineName}
                  </span>
                  <span className="font-mono text-slate-600 dark:text-zinc-400 text-[11px]">
                    ~{seg.durationMinutes} mnt • {seg.distanceKm} km
                  </span>
                </div>
                <p className="text-slate-800 dark:text-zinc-200 font-medium">
                  {seg.instruction}
                </p>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Dari: <strong>{seg.fromStation.name}</strong> ➔ Ke: <strong>{seg.toStation.name}</strong> ({seg.stopCount - 1} perhentian)
                </div>
              </div>
            ))}

            {/* Last-Mile Walk */}
            {routePlan.lastMileWalk && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs">
                <Footprints className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-zinc-100">
                    Jalan Kaki ke Tujuan Akhir (~{routePlan.lastMileWalk.durationMinutes} mnt • {formatDistance(routePlan.lastMileWalk.distanceMeters)})
                  </div>
                  <div className="text-slate-600 dark:text-zinc-400 mt-0.5">
                    {routePlan.lastMileWalk.instruction}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action: Set Geo-Alarm Button */}
          <button
            type="button"
            onClick={() => armAlarm(routePlan.destination.id)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
              isAlarmArmed
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white active:scale-98'
            }`}
          >
            {isAlarmArmed ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Alarm Pengingat Turun Aktif di {routePlan.destination.name}</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Pasang Pengingat Turun (Geo-Alarm) di {routePlan.destination.name}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
