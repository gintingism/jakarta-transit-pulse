'use client';

import React from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import StationCombobox from './StationCombobox';
import RouteCard from './RouteCard';
import {
  ArrowUpDown,
  RotateCcw,
  Train,
  Bus,
  MapPin,
  Sparkles,
  Navigation,
} from 'lucide-react';

interface QuickDestination {
  name: string;
  category: 'poi' | 'krl' | 'tj' | 'mrt' | 'lrt';
  coords: [number, number];
  stationId?: string;
}

const QUICK_DESTINATIONS: QuickDestination[] = [
  { name: 'Monas', category: 'poi', coords: [-6.1754, 106.8272], stationId: 'tj_monas' },
  { name: 'Bundaran HI', category: 'mrt', coords: [-6.19185, 106.82306], stationId: 'mrt_bundaran_hi' },
  { name: 'Dukuh Atas TOD', category: 'mrt', coords: [-6.2008, 106.82283], stationId: 'mrt_dukuh_atas' },
  { name: 'Halim (Whoosh)', category: 'lrt', coords: [-6.24479, 106.88566], stationId: 'lrt_halim' },
  { name: 'Grand Indonesia', category: 'poi', coords: [-6.1958, 106.8215] },
  { name: 'GBK Senayan', category: 'poi', coords: [-6.2186, 106.8018], stationId: 'mrt_istora' },
  { name: 'Plaza Blok M', category: 'mrt', coords: [-6.24442, 106.79824], stationId: 'mrt_blokm' },
  { name: 'Stasiun Manggarai', category: 'krl', coords: [-6.2093, 106.8489], stationId: 'krl_manggarai' },
  { name: 'Bandara Soekarno-Hatta (SHIA)', category: 'krl', coords: [-6.12748, 106.65179], stationId: 'ka_bandara_shia' },
  { name: 'Halte Harmoni', category: 'tj', coords: [-6.1625, 106.8199], stationId: 'tj_harmoni' },
];

export default function RouteFinder() {
  const originStopId = useTransitStore((s) => s.originStopId);
  const destinationStopId = useTransitStore((s) => s.destinationStopId);
  const originPlace = useTransitStore((s) => s.originPlace);
  const destinationPlace = useTransitStore((s) => s.destinationPlace);
  const routePlan = useTransitStore((s) => s.routePlan);
  const isRoutingLoading = useTransitStore((s) => s.isRoutingLoading);
  const isAlarmArmed = useTransitStore((s) => s.isAlarmArmed);
  const alarmTargetStopId = useTransitStore((s) => s.alarmTargetStopId);
  const routePreference = useTransitStore((s) => s.routePreference);
  const setOriginStop = useTransitStore((s) => s.setOriginStop);
  const setDestinationStop = useTransitStore((s) => s.setDestinationStop);
  const setOriginPlace = useTransitStore((s) => s.setOriginPlace);
  const setDestinationPlace = useTransitStore((s) => s.setDestinationPlace);
  const useCurrentLocationAsOrigin = useTransitStore((s) => s.useCurrentLocationAsOrigin);
  const swapStops = useTransitStore((s) => s.swapStops);
  const clearRoute = useTransitStore((s) => s.clearRoute);
  const setRoutePreference = useTransitStore((s) => s.setRoutePreference);
  const armAlarm = useTransitStore((s) => s.armAlarm);
  const setActiveTab = useTransitStore((s) => s.setActiveTab);

  const handleSetAlarm = (stationId: string) => {
    armAlarm(stationId);
    setActiveTab('alarm');
  };

  const isDestinationArmed =
    isAlarmArmed && routePlan && alarmTargetStopId === routePlan.destination.id;

  return (
    <div className="space-y-4 text-slate-900 dark:text-zinc-100">
      {/* Route Inputs Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-sky-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
              Cari Rute & Navigasi
            </h2>
          </div>
          {(originStopId || destinationStopId || originPlace || destinationPlace) && (
            <button
              type="button"
              onClick={clearRoute}
              className="text-[11px] text-slate-600 dark:text-zinc-400 hover:text-slate-800 dark:text-zinc-200 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Dynamic Searchable Autocomplete Inputs */}
        <div className="space-y-2 relative">
          <StationCombobox
            label="Dari Mana? (Titik Keberangkatan)"
            selectedStationId={originStopId}
            selectedPlace={originPlace}
            onSelect={setOriginStop}
            onSelectPlace={setOriginPlace}
            onUseCurrentLocation={useCurrentLocationAsOrigin}
            placeholder="Ketik lokasi atau klik Lokasi Saya..."
            dotColor="bg-emerald-400"
          />

          {/* Swap Button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              type="button"
              onClick={swapStops}
              className="p-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 shadow-sm transition hover:scale-105 active:rotate-180"
              title="Tukar Asal dan Tujuan"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <StationCombobox
            label="Mau ke Mana? (Tujuan Akhir)"
            selectedStationId={destinationStopId}
            selectedPlace={destinationPlace}
            onSelect={setDestinationStop}
            onSelectPlace={setDestinationPlace}
            placeholder="Ketik gedung, mall, atau stasiun (misal: Monas)..."
            dotColor="bg-sky-400"
          />
        </div>

        {/* Route Preference Selector */}
        <div className="mt-4 flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-lg border border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setRoutePreference('FASTEST')}
            className={`flex-1 py-1.5 px-2 text-[10px] font-semibold rounded-md transition cursor-pointer ${
              routePreference === 'FASTEST'
                ? 'bg-white dark:bg-zinc-800 text-sky-700 dark:text-sky-300 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            Tercepat
          </button>
          <button
            type="button"
            onClick={() => setRoutePreference('CHEAPEST')}
            className={`flex-1 py-1.5 px-2 text-[10px] font-semibold rounded-md transition cursor-pointer ${
              routePreference === 'CHEAPEST'
                ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            Termurah
          </button>
          <button
            type="button"
            onClick={() => setRoutePreference('FEWEST_TRANSFERS')}
            className={`flex-1 py-1.5 px-2 text-[10px] font-semibold rounded-md transition cursor-pointer ${
              routePreference === 'FEWEST_TRANSFERS'
                ? 'bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-300 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            Sedikit Transit
          </button>
        </div>

        {/* Quick 1-Tap Destinations */}
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] text-slate-700 dark:text-zinc-300 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Mau ke Mana? (Pilih Cepat 1-Tap):</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_DESTINATIONS.map((dest) => (
              <button
                key={`quick_dest_${dest.name}`}
                type="button"
                onClick={() => {
                  if (!originPlace && !originStopId) {
                    useCurrentLocationAsOrigin();
                  }
                  setDestinationPlace({
                    name: dest.name,
                    coords: dest.coords,
                    stationId: dest.stationId,
                  });
                }}
                className="text-[11px] py-1 px-2.5 rounded-lg bg-white dark:bg-zinc-800/90 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700/60 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 font-medium active:scale-95 shadow-sm cursor-pointer"
              >
                {dest.category === 'poi' ? (
                  <MapPin className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                ) : dest.category === 'krl' ? (
                  <Train className="w-3 h-3 text-sky-400" />
                ) : dest.category === 'mrt' ? (
                  <Train className="w-3 h-3 text-blue-400" />
                ) : dest.category === 'lrt' ? (
                  <Train className="w-3 h-3 text-amber-400" />
                ) : (
                  <Bus className="w-3 h-3 text-rose-400" />
                )}
                <span>{dest.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Computed Route Card Result */}
      {isRoutingLoading ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 text-center text-xs text-slate-600 dark:text-zinc-400 flex flex-col items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Menghitung rute multi-modal & jalur pejalan kaki...</span>
        </div>
      ) : routePlan ? (
        <RouteCard
          route={routePlan}
          isAlarmArmed={Boolean(isDestinationArmed)}
          onSetAlarm={handleSetAlarm}
        />
      ) : (originPlace || originStopId) && (destinationPlace || destinationStopId) ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-center text-xs text-slate-600 dark:text-zinc-400">
          Tidak ditemukan rute transit yang terhubung. Coba pilih stasiun transit perantara.
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900/50 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-5 text-center text-slate-500 dark:text-zinc-500 text-xs leading-relaxed">
          Pilih lokasi asal dan tujuan di atas atau gunakan tombol <strong>Lokasi Saya</strong> untuk langsung merencanakan perjalanan dari tempat Anda berdiri!
        </div>
      )}
    </div>
  );
}
