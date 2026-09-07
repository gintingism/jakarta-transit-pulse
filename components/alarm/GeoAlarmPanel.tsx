'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

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

  const [notifState, setNotifState] = useState<string>('default');

  const targetStation = alarmTargetStopId ? STATION_MAP[alarmTargetStopId] : null;

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

  const proximityPercent = currentDistanceMeters
    ? Math.min(100, Math.max(0, Math.round(((2000 - currentDistanceMeters) / 2000) * 100)))
    : 0;

  return (
    <div className="space-y-3.5 text-slate-900 dark:text-zinc-100">
      {/* Kartu Utama Pengingat Turun Stasiun */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Bell
              className={`w-4 h-4 ${
                isAlarmArmed ? 'text-rose-400 animate-bounce' : 'text-slate-600 dark:text-zinc-400'
              }`}
            />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Pengingat Turun (Geo-Alarm)
            </h2>
          </div>

          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-medium ${
              isAlarmArmed
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-pulse'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700'
            }`}
          >
            {isAlarmArmed ? 'ALARM AKTIF' : 'NONAKTIF'}
          </span>
        </div>

        {/* Pemilihan Stasiun Tujuan */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-sky-400" />
              Stasiun / Halte Tempat Anda Turun
            </label>
            <select
              value={alarmTargetStopId || ''}
              onChange={(e) => {
                setDestinationStop(e.target.value);
                armAlarm(e.target.value);
              }}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-sky-500 transition cursor-pointer"
            >
              <option value="">Pilih stasiun tujuan Anda...</option>
              <optgroup label="── KAI Bandara (Railink) ──">
                {STATIONS.filter((s) => s.lines.includes('kai-bandara')).map((station) => (
                  <option key={`alarm_target_${station.id}`} value={station.id}>
                    ✈️ {station.name} {station.code ? `(${station.code})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── MRT Jakarta ──">
                {STATIONS.filter((s) => s.type === 'mrt').map((station) => (
                  <option key={`alarm_target_${station.id}`} value={station.id}>
                    🚇 {station.name} {station.code ? `(${station.code})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── LRT Jabodebek & Jakarta ──">
                {STATIONS.filter((s) => s.type === 'lrt').map((station) => (
                  <option key={`alarm_target_${station.id}`} value={station.id}>
                    🚊 {station.name} {station.code ? `(${station.code})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── KRL Commuterline ──">
                {STATIONS.filter((s) => s.type === 'krl').map((station) => (
                  <option key={`alarm_target_${station.id}`} value={station.id}>
                    🚆 {station.name} {station.code ? `(${station.code})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── TransJakarta BRT ──">
                {STATIONS.filter((s) => s.type === 'tj').map((station) => (
                  <option key={`alarm_target_${station.id}`} value={station.id}>
                    🚌 {station.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Jarak Ambang Batas Peringatan */}
          <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-lg border border-slate-200 dark:border-zinc-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-600 dark:text-zinc-400 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-sky-400" />
                Bunyikan Alarm Pada Jarak:
              </span>
              <span className="text-xs font-mono font-semibold text-sky-600 dark:text-sky-300">
                {alarmThresholdMeters} meter sebelum tiba
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="1200"
              step="50"
              value={alarmThresholdMeters}
              onChange={(e) => setAlarmThreshold(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-500 mt-1">
              <span>200m (Dekat)</span>
              <span>400m (Standar)</span>
              <span>1.200m (Awal)</span>
            </div>
          </div>

          {/* Indikator Jarak GPS Real-Time */}
          <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                Sisa Jarak ke Stasiun:
              </span>
              <span className="text-sm font-mono font-semibold text-slate-900 dark:text-zinc-100">
                {currentDistanceMeters !== null
                  ? formatDistance(currentDistanceMeters)
                  : userCoords
                  ? 'Menunggu target'
                  : 'Mencari sinyal GPS...'}
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-500 ${
                  currentDistanceMeters !== null && currentDistanceMeters <= alarmThresholdMeters
                    ? 'bg-rose-500 animate-pulse'
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
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-md ${
              isAlarmArmed
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 active:scale-98'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-98'
            }`}
          >
            {isAlarmArmed ? (
              <>
                <BellOff className="w-4 h-4" />
                MATIKAN ALARM PENGINGAT
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                AKTIFKAN ALARM PENGINGAT
              </>
            )}
          </button>
        </div>
      </div>

      {/* Simulasi Uji Coba Cepat */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xl">
        <div className="flex items-center gap-2 mb-1.5">
          <Compass className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
            Uji Coba Alarm (Simulasi)
          </h3>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed mb-3">
          Ingin mengetes suara sirine dan getaran sebelum berangkat? Klik tombol di bawah untuk menyimulasikan kedatangan menuju{' '}
          <strong className="text-slate-800 dark:text-zinc-200">{targetStation?.name || 'stasiun tujuan'}</strong> dalam hitungan detik.
        </p>

        <div className="flex gap-2">
          {isSimulatingApproach ? (
            <button
              type="button"
              onClick={stopApproachSimulation}
              className="flex-1 py-2 px-3 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Hentikan Uji Coba
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startApproachSimulation(alarmTargetStopId || undefined)}
              className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm active:scale-98"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Tes Simulasi Mendekati Stasiun
            </button>
          )}
        </div>
      </div>

      {/* Tes Diagnostik Suara & Izin Notifikasi */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 space-y-2 text-[11px]">
        <div className="text-slate-500 dark:text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">
          Tes Audio & Izin Notifikasi:
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-zinc-800">
          <span className="text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Nada Kedatangan Stasiun
          </span>
          <button
            type="button"
            onClick={() => playTransitArrivalChime()}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center gap-1"
          >
            <Volume2 className="w-3 h-3" /> Tes Chime
          </button>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-zinc-800">
          <span className="text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Sirine Bangun Tidur
          </span>
          <button
            type="button"
            onClick={() => playDisembarkAlarmChime()}
            className="text-[10px] px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1"
          >
            <Volume2 className="w-3 h-3" /> Tes Sirine
          </button>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-slate-700 dark:text-zinc-300">Izin Push Notification</span>
          <button
            type="button"
            onClick={handleRequestNotif}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
          >
            {notifState === 'granted' ? '✓ Diizinkan' : 'Aktifkan Izin'}
          </button>
        </div>
      </div>
    </div>
  );
}
