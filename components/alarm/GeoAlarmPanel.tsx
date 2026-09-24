'use client';

import React, { useState, useRef } from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import { STATIONS, STATION_MAP } from '@/src/data/transitNetwork';
import { formatDistance } from '@/src/lib/transitEngine';
import { playTransitArrivalChime, playDisembarkAlarmChime } from '@/lib/audio';
import { requestNotificationPermission } from '@/lib/notifications';
import {
  Bell,
  BellOff,
  Radio,
  Sliders,
  Play,
  Square,
  Volume2,
  AlertTriangle,
  ShieldCheck,
  Target,
  Compass,
  Sparkles,
  MapPin,
  CheckCircle2,
  Zap,
  Battery,
  BatteryCharging,
} from 'lucide-react';

interface AlarmStopPreset {
  value: number;
  label: string;
  sub: string;
  badge?: string;
  desc: string;
}

const ALARM_STOPS: AlarmStopPreset[] = [
  { value: 200, label: '200m', sub: 'Dekat', desc: 'Peron Langsung (MRT/LRT)' },
  { value: 400, label: '400m', sub: 'Standar ⭐', badge: 'Rekomendasi', desc: 'Waktu Ideal Bersiap' },
  { value: 600, label: '600m', sub: 'Sedang', desc: 'Laju Cepat (KRL)' },
  { value: 800, label: '800m', sub: 'Jauh', desc: 'Stasiun Besar (Manggarai)' },
  { value: 1000, label: '1.000m', sub: '1 km', desc: 'Peringatan Awal' },
  { value: 1200, label: '1.200m', sub: '1.2 km', desc: 'Maksimal (Bandara)' },
];

export default function GeoAlarmPanel() {
  const alarmTargetStopId = useTransitStore((s) => s.alarmTargetStopId);
  const isAlarmArmed = useTransitStore((s) => s.isAlarmArmed);
  const alarmThresholdMeters = useTransitStore((s) => s.alarmThresholdMeters);
  const currentDistanceMeters = useTransitStore((s) => s.currentDistanceMeters);
  const userCoords = useTransitStore((s) => s.userCoords);
  const armAlarm = useTransitStore((s) => s.armAlarm);
  const disarmAlarm = useTransitStore((s) => s.disarmAlarm);
  const setAlarmThreshold = useTransitStore((s) => s.setAlarmThreshold);
  const setDestinationStop = useTransitStore((s) => s.setDestinationStop);
  const isSimulatingApproach = useTransitStore((s) => s.isSimulatingApproach);
  const startApproachSimulation = useTransitStore((s) => s.startApproachSimulation);
  const stopApproachSimulation = useTransitStore((s) => s.stopApproachSimulation);
  const routePlan = useTransitStore((s) => s.routePlan);
  const isBatterySaverMode = useTransitStore((s) => s.isBatterySaverMode);
  const toggleBatterySaverMode = useTransitStore((s) => s.toggleBatterySaverMode);

  const [notifState, setNotifState] = useState<string>('default');
  const lastHapticStopRef = useRef<number>(alarmThresholdMeters);

  const targetStation = alarmTargetStopId ? STATION_MAP[alarmTargetStopId] : null;

  const triggerHaptic = (ms: number = 12) => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate?.(ms);
    }
  };

  const handleSelectPreset = (val: number) => {
    setAlarmThreshold(val);
    lastHapticStopRef.current = val;
    triggerHaptic(20);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setAlarmThreshold(val);
    if (ALARM_STOPS.some((s) => s.value === val) && lastHapticStopRef.current !== val) {
      lastHapticStopRef.current = val;
      triggerHaptic(14);
    }
  };

  const handleRequestNotif = async () => {
    const res = await requestNotificationPermission();
    setNotifState(res);
  };

  const handleToggleAlarm = () => {
    if (isAlarmArmed) {
      disarmAlarm();
    } else if (alarmTargetStopId) {
      armAlarm(alarmTargetStopId);
    }
  };

  // Slider progress percentage between 200m and 1200m
  const sliderProgressPct = Math.min(
    100,
    Math.max(0, Math.round(((alarmThresholdMeters - 200) / 1000) * 100))
  );

  // Proximity status calculations
  const isInsideAlarmRadius =
    currentDistanceMeters !== null && currentDistanceMeters <= alarmThresholdMeters;
  const isApproachingRadius =
    currentDistanceMeters !== null &&
    !isInsideAlarmRadius &&
    currentDistanceMeters <= alarmThresholdMeters * 2;

  const proximityPercent = currentDistanceMeters !== null
    ? Math.min(100, Math.max(0, Math.round(((2000 - currentDistanceMeters) / 2000) * 100)))
    : 0;

  // Find active preset metadata
  const currentStopPreset = ALARM_STOPS.find((s) => s.value === alarmThresholdMeters);

  return (
    <div className="space-y-3.5 text-slate-900 dark:text-zinc-100">
      {/* Kartu Utama Pengingat Turun Stasiun */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg flex items-center justify-center ${
                isAlarmArmed
                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-500 dark:text-rose-400 ring-2 ring-rose-500/20'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
              }`}
            >
              <Bell
                className={`w-4 h-4 ${isAlarmArmed ? 'animate-bounce text-rose-500' : ''}`}
              />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                Pengingat Turun (Geo-Alarm)
              </h2>
              <p className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                Alarm GPS otomatis sebelum stasiun tujuan kelewat
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${
              isAlarmArmed
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 animate-pulse'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
            }`}
          >
            {isAlarmArmed ? '● AKTIF MEMANTAU' : '○ NONAKTIF'}
          </span>
        </div>

        {/* Pemilihan Stasiun Tujuan */}
        <div className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-sky-500" />
                <span>Stasiun / Halte Tempat Anda Turun</span>
              </label>
              {targetStation && (
                <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                  {targetStation.type.toUpperCase()}
                </span>
              )}
            </div>

            <select
              value={alarmTargetStopId || ''}
              onChange={(e) => {
                setDestinationStop(e.target.value);
                armAlarm(e.target.value);
              }}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition cursor-pointer font-medium"
            >
              <option value="">Pilih stasiun tujuan Anda...</option>
              <optgroup label="• KAI Bandara (Railink) •">
                {STATIONS.filter((s) => s.lines.includes('kai-bandara')).map((station) => (
                  <option key={`alarm_target_${station.id}`} value={station.id}>
                    ✈️ {station.name} {station.code ? `(${station.code})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="• MRT Jakarta •">
                {STATIONS.filter((s) => s.type === 'mrt').map((station) => (
                  <option key={`alarm_target_${station.id}`} value={station.id}>
                    🚇 {station.name} {station.code ? `(${station.code})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="• LRT Jabodebek & Jakarta •">
                {STATIONS.filter((s) => s.type === 'lrt').map((station) => (
                  <option key={`alarm_target_${station.id}`} value={station.id}>
                    🚊 {station.name} {station.code ? `(${station.code})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="• KRL Commuterline •">
                {STATIONS.filter((s) => s.type === 'krl').map((station) => (
                  <option key={`alarm_target_${station.id}`} value={station.id}>
                    🚆 {station.name} {station.code ? `(${station.code})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="• TransJakarta BRT •">
                {STATIONS.filter((s) => s.type === 'tj').map((station) => (
                  <option key={`alarm_target_${station.id}`} value={station.id}>
                    🚌 {station.name}
                  </option>
                ))}
              </optgroup>
            </select>

            {/* Quick 1-Tap from Active Route Destination */}
            {routePlan?.destination && alarmTargetStopId !== routePlan.destination.id && (
              <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs">
                <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                  <span className="truncate text-[11px]">
                    Tujuan rute aktif: <strong>{routePlan.destination.name}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDestinationStop(routePlan.destination.id);
                    armAlarm(routePlan.destination.id);
                  }}
                  className="ml-2 shrink-0 py-1 px-2.5 text-[10.5px] font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-transform duration-150 ease-out shadow-xs cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
                >
                  Gunakan Ini
                </button>
              </div>
            )}
          </div>

          {/* Enhanced Jarak Ambang Batas Slider (With Dots & Penahan) */}
          <div className="bg-slate-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-800 dark:text-zinc-200">
                <Sliders className="w-3.5 h-3.5 text-sky-500" />
                <span>Radius Peringatan Alarm:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
                  {alarmThresholdMeters} meter
                </span>
                {alarmThresholdMeters === 400 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Ideal
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Track With Dots & Penahan */}
            <div className="pt-2 pb-1">
              <div className="relative w-full px-3 py-3 flex flex-col justify-center">
                {/* Physical Base Track (spans inside the 12px padding) */}
                <div className="relative w-full h-2 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center">
                  {/* Glowing Active Track Fill */}
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 transition-all duration-75"
                    style={{ width: `${sliderProgressPct}%` }}
                  />

                  {/* Tick Dots (Penahan / Snap Points) */}
                  {ALARM_STOPS.map((stop) => {
                    const stopPct = ((stop.value - 200) / 1000) * 100;
                    const isPassed = alarmThresholdMeters >= stop.value;
                    const isCurrent = alarmThresholdMeters === stop.value;

                    return (
                      <div
                        key={`dot_${stop.value}`}
                        style={{ left: `${stopPct}%` }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-10 flex items-center justify-center"
                      >
                        <div
                          className={`rounded-full transition-all duration-150 ${
                            isCurrent
                              ? 'w-3 h-3 bg-sky-500 dark:bg-sky-400 ring-4 ring-sky-500/30'
                              : isPassed
                              ? 'w-1.5 h-1.5 bg-white dark:bg-zinc-900 opacity-90'
                              : 'w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-600'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Range Input Slider Thumb (spans full width of container) */}
                <input
                  type="range"
                  min="200"
                  max="1200"
                  step="50"
                  value={alarmThresholdMeters}
                  onChange={handleSliderChange}
                  className="alarm-range-slider absolute inset-x-0 top-1/2 -translate-y-1/2 w-full cursor-pointer z-20"
                  aria-label="Atur radius jarak alarm"
                />
              </div>

              {/* Tick Stop Labels under the Track */}
              <div className="relative w-full px-3 h-5 mt-1">
                <div className="relative w-full h-full">
                  {ALARM_STOPS.map((stop) => {
                    const stopPct = ((stop.value - 200) / 1000) * 100;
                    const isSelected = alarmThresholdMeters === stop.value;
                    return (
                      <button
                        key={`label_${stop.value}`}
                        type="button"
                        onClick={() => handleSelectPreset(stop.value)}
                        style={{ left: `${stopPct}%` }}
                        className={`absolute top-0 -translate-x-1/2 text-[9.5px] font-mono tabular-nums transition-all cursor-pointer whitespace-nowrap px-1 py-0.5 rounded ${
                          isSelected
                            ? 'text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/80 ring-1 ring-sky-500/30'
                            : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                        }`}
                      >
                        {stop.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Context Description of Selected Distance */}
              {currentStopPreset && (
                <div className="text-center text-[10.5px] text-slate-500 dark:text-zinc-400 mt-2">
                  Karakteristik: <span className="font-semibold text-slate-800 dark:text-zinc-200">{currentStopPreset.desc}</span>
                </div>
              )}
            </div>

            {/* Quick 1-Tap Preset Chips Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
              {ALARM_STOPS.map((stop) => {
                const isSelected = alarmThresholdMeters === stop.value;
                return (
                  <button
                    key={`preset_pill_${stop.value}`}
                    type="button"
                    onClick={() => handleSelectPreset(stop.value)}
                    className={`py-1.5 px-1.5 rounded-lg text-center transition-transform duration-150 ease-out cursor-pointer border flex flex-col items-center justify-center active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-500 text-sky-700 dark:text-sky-300 font-bold ring-2 ring-sky-500/20 shadow-xs'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-[11px] font-mono font-bold tabular-nums">
                      {stop.label}
                    </div>
                    <div className="text-[9px] opacity-75 truncate max-w-full">
                      {stop.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Hemat Daya Cerdas Toggle Card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 transition">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                  isBatterySaverMode
                    ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                }`}
              >
                {isBatterySaverMode ? (
                  <BatteryCharging className="w-4 h-4" />
                ) : (
                  <Battery className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                    Mode Hemat Daya Cerdas
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
                      isBatterySaverMode
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-300 dark:border-zinc-700'
                    }`}
                  >
                    {isBatterySaverMode ? 'AKTIF' : 'NONAKTIF'}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-zinc-400 leading-tight mt-0.5">
                  Hemat baterai saat jarak &gt;2 km, otomatis presisi tinggi saat mendekati stasiun tujuan.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isBatterySaverMode}
              onClick={toggleBatterySaverMode}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
                isBatterySaverMode ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'
              }`}
              title={isBatterySaverMode ? 'Matikan Mode Hemat Daya Cerdas' : 'Aktifkan Mode Hemat Daya Cerdas'}
              aria-label="Toggle battery saver mode"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isBatterySaverMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Indikator Radar Proximity Real-Time */}
          <div
            className={`p-3.5 rounded-xl border transition-all duration-300 ${
              isInsideAlarmRadius
                ? 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-500 shadow-md shadow-rose-500/15'
                : isApproachingRadius
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/80'
                : 'bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <Radio
                  className={`w-3.5 h-3.5 ${
                    isInsideAlarmRadius
                      ? 'text-rose-500 animate-pulse'
                      : isApproachingRadius
                      ? 'text-amber-500'
                      : 'text-sky-500'
                  }`}
                />
                <span>Status Radar GPS:</span>
              </div>

              <span className="text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-zinc-100">
                {currentDistanceMeters !== null
                  ? formatDistance(currentDistanceMeters)
                  : userCoords
                  ? 'Menunggu target'
                  : 'Mencari sinyal GPS...'}
              </span>
            </div>

            {/* Dynamic Status Notification */}
            <div className="text-[11px] leading-relaxed mb-2">
              {isInsideAlarmRadius ? (
                <div className="text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>ZONA ALARM! Anda sudah berada di dalam radius kedatangan. Bersiap turun sekarang!</span>
                </div>
              ) : isApproachingRadius ? (
                <div className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  <span>Mendekati stasiun tujuan. Mulai rapikan barang bawaan Anda.</span>
                </div>
              ) : currentDistanceMeters !== null ? (
                <div className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>Perjalanan berlangsung. Alarm akan otomatis menyala di radius {alarmThresholdMeters}m.</span>
                </div>
              ) : (
                <div className="text-slate-500 dark:text-zinc-500">
                  Pastikan stasiun tujuan dipilih dan izin lokasi diaktifkan pada perangkat.
                </div>
              )}
            </div>

            {/* Dual Meter Progress Bar */}
            <div className="relative w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isInsideAlarmRadius
                    ? 'bg-rose-500 animate-pulse'
                    : isApproachingRadius
                    ? 'bg-amber-500'
                    : 'bg-sky-500'
                }`}
                style={{ width: `${proximityPercent}%` }}
              />
            </div>
          </div>

          {/* Tombol Utama Aktifkan / Matikan Alarm */}
          <button
            type="button"
            onClick={handleToggleAlarm}
            disabled={!alarmTargetStopId}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold tracking-wide uppercase transition-transform duration-150 ease-out flex items-center justify-center gap-2 shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 focus-visible:outline-none ${
              !alarmTargetStopId
                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed'
                : isAlarmArmed
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-200 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 active:scale-[0.98] focus-visible:ring-rose-500'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] focus-visible:ring-emerald-500'
            }`}
          >
            {isAlarmArmed ? (
              <>
                <BellOff className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Matikan Alarm Pengingat</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 text-white" />
                <span>Aktifkan Alarm Pengingat</span>
              </>
            )}
          </button>

          {isAlarmArmed && (
            <div className="p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 animate-fade-in">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div className="leading-snug">
                <span className="font-bold">Proteksi Latar Belakang & Layar Siaga Aktif</span>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Layar HP dijaga tetap siaga (Wake Lock). Bila dimasukkan ke saku atau layar terkunci, alarm dan GPS tetap aktif memantau jarak stasiun via modul audio keep-alive.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulasi Uji Coba Cepat */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
              Uji Coba Alarm (Simulasi)
            </h3>
          </div>
          {isSimulatingApproach && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 animate-pulse">
              SIMULASI BERJALAN
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
          Ingin mengetes suara sirine dan getaran sebelum berangkat? Klik tombol di bawah untuk menyimulasikan kedatangan menuju{' '}
          <strong className="text-slate-800 dark:text-zinc-200">{targetStation?.name || 'stasiun tujuan'}</strong> dalam hitungan detik.
        </p>

        {/* Live Simulation Banner */}
        {isSimulatingApproach && (
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-300 animate-pulse">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
              <span className="text-[11px] truncate">Mendekati {targetStation?.name || 'stasiun'}...</span>
            </div>
            <span className="font-mono font-bold tabular-nums text-xs ml-2">
              {currentDistanceMeters !== null ? formatDistance(currentDistanceMeters) : ''}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          {isSimulatingApproach ? (
            <button
              type="button"
              onClick={stopApproachSimulation}
              className="flex-1 py-2 px-3 bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-transform duration-150 ease-out active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Hentikan Simulasi
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startApproachSimulation(alarmTargetStopId || undefined)}
              className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-transform duration-150 ease-out shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Tes Simulasi Mendekati Stasiun
            </button>
          )}
        </div>
      </div>

      {/* Tes Diagnostik Suara & Izin Notifikasi */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-2.5 text-[11px]">
        <div className="text-slate-500 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
          Pusat Uji Audio & Izin Notifikasi:
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800/80">
          <span className="text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-sky-500" />
            Nada Kedatangan Stasiun (Chime)
          </span>
          <button
            type="button"
            onClick={() => playTransitArrivalChime()}
            className="text-[10.5px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center gap-1 font-medium transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current text-sky-500" /> Tes Chime
          </button>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800/80">
          <span className="text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Sirine Bangun Tidur (Disembark)
          </span>
          <button
            type="button"
            onClick={() => playDisembarkAlarmChime()}
            className="text-[10.5px] px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1 font-bold transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current text-rose-500" /> Tes Sirine
          </button>
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Izin Notifikasi Layar Kunci
          </span>
          <button
            type="button"
            onClick={handleRequestNotif}
            className={`text-[10.5px] px-2.5 py-1 rounded-lg font-bold transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer ${
              notifState === 'granted'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
            }`}
          >
            {notifState === 'granted' ? '✓ Diizinkan' : 'Aktifkan Izin'}
          </button>
        </div>
      </div>
    </div>
  );
}
