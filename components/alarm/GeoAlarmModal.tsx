'use client';

import React from 'react';
import { Station } from '@/src/data/transitNetwork';
import { formatDistance } from '@/src/lib/transitEngine';
import { AlertTriangle, BellOff, MapPin, CheckCircle } from 'lucide-react';

import { useTransitStore } from '@/stores/useTransitStore';
import { STATION_MAP } from '@/src/data/transitNetwork';

interface GeoAlarmModalProps {
  isOpen?: boolean;
  targetStation?: Station | null;
  distanceMeters?: number | null;
  thresholdMeters?: number;
  onDismiss?: () => void;
  onDisarm?: () => void;
}

export default function GeoAlarmModal(props: GeoAlarmModalProps) {
  const storeIsTriggered = useTransitStore((s) => s.isAlarmTriggered);
  const storeTargetId = useTransitStore((s) => s.alarmTargetStopId);
  const storeDistance = useTransitStore((s) => s.currentDistanceMeters);
  const storeThreshold = useTransitStore((s) => s.alarmThresholdMeters);
  const storeDismiss = useTransitStore((s) => s.dismissAlarm);
  const storeDisarm = useTransitStore((s) => s.disarmAlarm);

  const isOpen = props.isOpen !== undefined ? props.isOpen : storeIsTriggered;
  const targetStation =
    props.targetStation !== undefined
      ? props.targetStation
      : storeTargetId
      ? STATION_MAP[storeTargetId] || null
      : null;
  const distanceMeters =
    props.distanceMeters !== undefined ? props.distanceMeters : storeDistance;
  const thresholdMeters =
    props.thresholdMeters !== undefined ? props.thresholdMeters : storeThreshold;
  const onDismiss = props.onDismiss || storeDismiss;
  const onDisarm = props.onDisarm || storeDisarm;

  if (!isOpen || !targetStation) {
    return null;
  }

  const formatted =
    distanceMeters !== null ? formatDistance(distanceMeters) : `< ${thresholdMeters} m`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-50 dark:bg-zinc-950 border-2 border-rose-500/80 rounded-2xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)] text-center text-slate-900 dark:text-zinc-100 animate-scale-up">
        {/* Pulsing Warning Badge */}
        <div className="flex justify-center mb-4">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-16 h-16 rounded-full bg-rose-500/30 animate-ping" />
            <div className="w-14 h-14 rounded-full bg-rose-950/80 border-2 border-rose-500 flex items-center justify-center text-rose-400 shadow-lg">
              <AlertTriangle className="w-7 h-7 animate-bounce" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight uppercase">
          Waktunya Turun!
        </h2>

        <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold tracking-wide uppercase mt-1">
          Stasiun Tujuan Sudah Dekat
        </p>

        {/* Station Target Card */}
        <div className="my-5 p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-zinc-400 text-xs mb-1">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>Tiba di:</span>
          </div>

          <div className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            {targetStation.name}
          </div>

          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-200 text-xs font-mono font-semibold">
            <span>Sisa Jarak:</span>
            <span className="text-rose-900 dark:text-white font-bold">{formatted}</span>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed mb-5">
          Periksa kembali barang bawaan Anda dan bersiap untuk menuju pintu keluar kereta atau bus.
        </p>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition active:scale-98 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>SAYA SUDAH SIAP / MATIKAN SIRINE</span>
          </button>

          <button
            type="button"
            onClick={onDisarm}
            className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition flex items-center justify-center gap-1.5"
          >
            <BellOff className="w-3.5 h-3.5" />
            <span>Nonaktifkan Pengingat Sepenuhnya</span>
          </button>
        </div>
      </div>
    </div>
  );
}
