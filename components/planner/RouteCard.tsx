'use client';

import React, { useState, useEffect } from 'react';
import { RoutePlan, formatDistance, calculateTripImpact } from '@/src/lib/transitEngine';
import { fetchStationWeather, TransitWeather } from '@/src/lib/weatherService';
import { useTransitStore } from '@/stores/useTransitStore';
import {
  Clock,
  Compass,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  MapPin,
  GitCommit,
  Footprints,
  AlertTriangle,
  Share2,
  Check,
  Leaf,
  Focus,
  Navigation,
} from 'lucide-react';

interface RouteCardProps {
  route: RoutePlan;
  isAlarmArmed?: boolean;
  onSetAlarm?: (stationId: string) => void;
}

export default function RouteCard({
  route,
  isAlarmArmed = false,
  onSetAlarm,
}: RouteCardProps) {
  const [showStopsList, setShowStopsList] = useState(false);
  const [copied, setCopied] = useState(false);
  const [weather, setWeather] = useState<TransitWeather | null>(null);

  useEffect(() => {
    const destCoords = route.destination.coords;
    if (!destCoords) return;
    const controller = new AbortController();
    void fetchStationWeather(destCoords, { signal: controller.signal }).then((w) => {
      if (w) setWeather(w);
    });
    return () => controller.abort();
  }, [route.destination.id, route.destination.coords]);

  const activeSegmentId = useTransitStore((s) => s.activeSegmentId);
  const setActiveSegmentId = useTransitStore((s) => s.setActiveSegmentId);
  const originStopId = useTransitStore((s) => s.originStopId);
  const destinationStopId = useTransitStore((s) => s.destinationStopId);
  const originPlace = useTransitStore((s) => s.originPlace);
  const destinationPlace = useTransitStore((s) => s.destinationPlace);
  const routePreference = useTransitStore((s) => s.routePreference);
  const startNavigation = useTransitStore((s) => s.startNavigation);

  const originDisplay = route.originPlaceName || route.origin.name;
  const destDisplay = route.destinationPlaceName || route.destination.name;

  // Calculate environmental and budget impact
  const firstMileMeters = route.firstMileWalk?.distanceMeters || 0;
  const lastMileMeters = route.lastMileWalk?.distanceMeters || 0;
  const transferMeters = (route.transfers || []).reduce((acc, t) => acc + (t.walkMinutes * 75), 0);
  const totalWalkMeters = firstMileMeters + lastMileMeters + transferMeters;
  const impact = calculateTripImpact(route.totalDistanceKm, route.totalFareIdr, totalWalkMeters);

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const fromVal = originStopId || originPlace?.name;
    const toVal = destinationStopId || destinationPlace?.name;

    if (fromVal) url.searchParams.set('from', fromVal);
    if (toVal) url.searchParams.set('to', toVal);
    if (routePreference) url.searchParams.set('pref', routePreference);

    void navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-xl text-slate-900 dark:text-zinc-100 space-y-3.5">
      {/* Metric Header - Two Tier Spacious Layout */}
      <div className="border-b border-slate-200 dark:border-zinc-800/90 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-zinc-100 font-bold text-base">
              <Clock className="w-4 h-4 text-sky-500" />
              <span>~{route.totalDurationMinutes} mnt</span>
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              ({route.totalDistanceKm} km)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Share Route Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 transition cursor-pointer active:scale-95"
              title="Salin tautan rute ini"
              aria-label="Bagikan Rute"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Disalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-sky-500" />
                  <span>Bagikan</span>
                </>
              )}
            </button>

            {/* Total Fare Badge */}
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Rp {route.totalFareIdr.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 font-medium">
            {route.segments.length === 1
              ? 'Perjalanan Langsung'
              : `${route.segments.length - 1}x Transit Multi-Moda`}
          </span>
          <span className="text-slate-400 dark:text-zinc-600">•</span>
          <span className="text-slate-500 dark:text-zinc-400">
            {route.allStops.length} stasiun total
          </span>
          {weather && (
            <>
              <span className="text-slate-400 dark:text-zinc-600">•</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium text-[11px] ${
                  weather.isRaining
                    ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    : 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300'
                }`}
                title={weather.advisoryText}
              >
                <span>{weather.icon}</span>
                <span>{weather.temperatureC}°C {weather.conditionText}</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Summary Path Badges with Generous Truncation */}
      <div className="flex items-center gap-1.5 text-xs font-medium overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg text-slate-800 dark:text-zinc-200 shrink-0 border border-slate-200 dark:border-zinc-700">
          <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="truncate max-w-[150px] sm:max-w-[180px] font-semibold">{originDisplay}</span>
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />

        {(route.transfers || (route.transfer ? [route.transfer] : [])).map(
          (t, tIdx) => (
            <React.Fragment key={`badge_transfer_${tIdx}`}>
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1.5 rounded-lg text-amber-800 dark:text-amber-300 shrink-0 text-[11px]">
                <GitCommit className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span className="truncate max-w-[140px] sm:max-w-[160px] font-medium">
                  {t.toStation.name}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
            </React.Fragment>
          )
        )}

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg text-slate-800 dark:text-zinc-200 shrink-0 border border-slate-200 dark:border-zinc-700">
          <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="truncate max-w-[150px] sm:max-w-[180px] font-semibold">{destDisplay}</span>
        </div>
      </div>

      {/* Eco & Budget Impact Metrics Banner */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-500/20 dark:border-emerald-500/30 text-[11px] space-y-2">
        <div className="flex items-center justify-between font-semibold text-emerald-900 dark:text-emerald-300">
          <span className="flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Dampak Hemat & Lingkungan
          </span>
          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300/60 dark:border-emerald-800/40">
            Efisiensi Perjalanan
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-emerald-500/20">
          <div className="p-2 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Hemat vs Ojol</div>
            <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              Rp {impact.costSavedVsOjolIdr.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-teal-200 dark:border-teal-900/50 shadow-xs">
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Emisi CO₂</div>
            <div className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 mt-0.5">
              -{impact.co2SavedKg} kg
            </div>
          </div>

          <div className="p-2 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-sky-200 dark:border-sky-900/50 shadow-xs">
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Kalori Jalan</div>
            <div className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 mt-0.5">
              ~{impact.caloriesBurnedKcal} kkal
            </div>
          </div>
        </div>
      </div>

      {/* Official Multi-Modal Fare Breakdown */}
      {route.fareBreakdown && route.fareBreakdown.length > 0 && (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[11px] space-y-1.5">
          <div className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
              Rincian Tarif Resmi:
            </span>
            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
              Total Rp {route.totalFareIdr.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-zinc-800/60">
            {route.fareBreakdown.map((b, bIdx) => (
              <div
                key={`fare_b_${bIdx}`}
                className="flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-400 py-0.5 border-b border-slate-100 dark:border-zinc-900 last:border-0"
              >
                <span>{b.description}</span>
                <span className="font-mono font-medium text-slate-800 dark:text-zinc-200">
                  Rp {b.fare.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Segment Breakdown with Interactive Map Focus */}
      <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
        {/* First-Mile Walking Segment */}
        {route.firstMileWalk && (() => {
          const isFirstMileActive = activeSegmentId === 'first-mile';
          return (
            <div
              onClick={() => setActiveSegmentId(isFirstMileActive ? null : 'first-mile')}
              className="relative pl-8 cursor-pointer group transition duration-200"
              title="Klik untuk menyorot rute pejalan kaki di peta"
            >
              <div className="absolute left-2 top-2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 bg-amber-500 shadow" />
              <div className={`rounded-xl p-3 transition ${
                isFirstMileActive
                  ? 'ring-2 ring-amber-500 border border-amber-500 bg-amber-100/50 dark:bg-amber-950/70 shadow-lg scale-[1.01]'
                  : 'bg-amber-50/40 dark:bg-zinc-950/70 border border-amber-200 dark:border-amber-900/40 hover:border-amber-400'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50 flex items-center gap-1">
                    <Footprints className="w-3 h-3" />
                    Jalan Kaki (First-Mile)
                  </span>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 transition font-medium ${
                      isFirstMileActive
                        ? 'bg-amber-500 text-white font-bold'
                        : 'text-slate-500 dark:text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400'
                    }`}>
                      <Focus className="w-3 h-3" /> {isFirstMileActive ? 'Sedang Disorot' : 'Sorot Peta'}
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono">
                      ~{route.firstMileWalk.durationMinutes} mnt ({formatDistance(route.firstMileWalk.distanceMeters)})
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-zinc-300 leading-relaxed">
                  {route.firstMileWalk.instruction}
                </p>
                {route.firstMileWalk.isWarningLongWalk && (
                  <div className="mt-2 text-[10px] text-amber-800 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 p-2 rounded-lg flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Jarak jalan kaki cukup jauh (&gt;1.5 km). Disarankan menyambung Mikrotrans (JakLingko) atau Ojol.
                    </span>
                  </div>
                )}
                <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-500 font-mono">
                  <span>Trotoar pejalan kaki</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tarif: Rp 0</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Transit Rides */}
        {route.segments.map((seg, idx) => {
          const isSegActive = activeSegmentId === seg.id || activeSegmentId === `seg-${idx}`;
          return (
            <React.Fragment key={seg.id}>
              {/* Segment Card */}
              <div
                onClick={() => setActiveSegmentId(isSegActive ? null : seg.id)}
                className="relative pl-8 cursor-pointer group transition duration-200"
                title="Klik untuk menyorot lintasan moda ini di peta"
              >
                <div
                  className="absolute left-2 top-2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 shadow"
                  style={{ backgroundColor: seg.lineColor }}
                />

                <div className={`rounded-xl p-3 transition ${
                  isSegActive
                    ? 'ring-2 ring-sky-500 border border-sky-500 bg-sky-50/70 dark:bg-sky-950/70 shadow-lg scale-[1.01]'
                    : 'bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800/80 hover:border-sky-400'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded text-white shadow-xs"
                      style={{ backgroundColor: seg.lineColor }}
                    >
                      {seg.lineName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 transition font-medium ${
                        isSegActive
                          ? 'bg-sky-500 text-white font-bold'
                          : 'text-slate-500 dark:text-zinc-400 group-hover:text-sky-600 dark:group-hover:text-sky-400'
                      }`}>
                        <Focus className="w-3 h-3" /> {isSegActive ? 'Sedang Disorot' : 'Sorot Peta'}
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono">
                        ~{seg.durationMinutes} mnt ({seg.stopCount - 1} halte/stasiun)
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 mt-1 font-semibold">
                    <span>{seg.fromStation.name}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                    <span className="text-sky-700 dark:text-sky-300 font-bold">{seg.toStation.name}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    {seg.instruction}
                  </p>

                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-slate-600 dark:text-zinc-400 font-mono">
                    <span>Jarak: {seg.distanceKm} km</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Tarif: Rp {seg.fareIdr.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transfer Intermission */}
              {idx < route.segments.length - 1 &&
                (route.transfers?.[idx] || (idx === 0 ? route.transfer : undefined)) && (
                  <div className="relative pl-8 my-1.5">
                    <div className="absolute left-2.5 top-2.5 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white dark:border-zinc-900" />
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg p-2.5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                      <Footprints className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-[11px] leading-tight font-medium">
                        {route.transfers?.[idx]?.instruction ||
                          route.transfer?.instruction}
                      </span>
                    </div>
                  </div>
                )}
            </React.Fragment>
          );
        })}

        {/* Last-Mile Walking Segment */}
        {route.lastMileWalk && (() => {
          const isLastMileActive = activeSegmentId === 'last-mile';
          return (
            <div
              onClick={() => setActiveSegmentId(isLastMileActive ? null : 'last-mile')}
              className="relative pl-8 cursor-pointer group transition duration-200"
              title="Klik untuk menyorot rute pejalan kaki tujuan di peta"
            >
              <div className="absolute left-2 top-2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 bg-amber-500 shadow" />
              <div className={`rounded-xl p-3 transition ${
                isLastMileActive
                  ? 'ring-2 ring-amber-500 border border-amber-500 bg-amber-100/50 dark:bg-amber-950/70 shadow-lg scale-[1.01]'
                  : 'bg-amber-50/40 dark:bg-zinc-950/70 border border-amber-200 dark:border-amber-900/40 hover:border-amber-400'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50 flex items-center gap-1">
                    <Footprints className="w-3 h-3" />
                    Jalan Kaki ke Tujuan (Last-Mile)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 transition font-medium ${
                      isLastMileActive
                        ? 'bg-amber-500 text-white font-bold'
                        : 'text-slate-500 dark:text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400'
                    }`}>
                      <Focus className="w-3 h-3" /> {isLastMileActive ? 'Sedang Disorot' : 'Sorot Peta'}
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono">
                      ~{route.lastMileWalk.durationMinutes} mnt ({formatDistance(route.lastMileWalk.distanceMeters)})
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-zinc-300 leading-relaxed">
                  {route.lastMileWalk.instruction}
                </p>
                {route.lastMileWalk.isWarningLongWalk && (
                  <div className="mt-2 text-[10px] text-amber-800 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 p-2 rounded-lg flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Jarak jalan kaki cukup jauh (&gt;1.5 km). Disarankan menyambung Mikrotrans (JakLingko) atau Ojol.
                    </span>
                  </div>
                )}
                <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-500 font-mono">
                  <span>Trotoar pejalan kaki</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tarif: Rp 0</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Expandable Stops Sequence */}
      <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowStopsList(!showStopsList)}
          className="text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 flex items-center gap-1 transition cursor-pointer"
        >
          <span>Daftar Semua ({route.allStops.length} Stasiun/Halte)</span>
          {showStopsList ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                try {
                  window.speechSynthesis.cancel();
                  window.speechSynthesis.resume();
                } catch {
                  // Ignore
                }
              }
              startNavigation(route);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm hover:shadow-cyan-500/25 active:scale-95 cursor-pointer"
            title="Mulai Panduan Navigasi Turn-by-Turn GPS & Suara"
          >
            <Navigation className="w-3.5 h-3.5 fill-current" />
            <span>Mulai Navigasi</span>
          </button>

          {onSetAlarm && (
            <button
              type="button"
              onClick={() => onSetAlarm(route.destination.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer ${
                isAlarmArmed
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95'
              }`}
            >
              {isAlarmArmed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Alarm Aktif</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Pasang Alarm</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showStopsList && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800/80 max-h-48 overflow-y-auto space-y-1 pr-1 text-xs text-slate-700 dark:text-zinc-300 divide-y divide-slate-200 dark:divide-zinc-800">
          {route.allStops.map((stop, i) => (
            <div
              key={`stop_${stop.id}_${i}`}
              className="py-1 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono w-4">
                  {i + 1}.
                </span>
                <span className={i === 0 || i === route.allStops.length - 1 ? 'font-semibold text-slate-900 dark:text-zinc-100' : ''}>
                  {stop.name}
                </span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono ${
                  stop.type === 'krl' ? 'bg-sky-950 text-sky-400' : 'bg-rose-950 text-rose-400'
                }`}
              >
                {stop.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
