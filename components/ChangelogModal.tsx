'use client';

import React, { useEffect } from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import {
  APP_VERSION,
  CHANGELOG_ENTRIES,
  ChangelogChange,
} from '@/src/data/changelog';
import {
  X,
  Sparkles,
  Wrench,
  Zap,
  Calendar,
  Tag,
  MessageSquarePlus,
  CheckCircle2,
} from 'lucide-react';

export const CHANGELOG_STORAGE_KEY = 'last_seen_version';

function ChangeBadge({ type }: { type: ChangelogChange['type'] }) {
  switch (type) {
    case 'feat':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>Fitur Baru</span>
        </span>
      );
    case 'fix':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shrink-0">
          <Wrench className="w-3 h-3 text-amber-500" />
          <span>Perbaikan</span>
        </span>
      );
    case 'perf':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 shrink-0">
          <Zap className="w-3 h-3 text-sky-500" />
          <span>Peningkatan</span>
        </span>
      );
  }
}

export default function ChangelogModal() {
  const isChangelogModalOpen = useTransitStore((s) => s.isChangelogModalOpen);
  const setChangelogModalOpen = useTransitStore((s) => s.setChangelogModalOpen);
  const setFeedbackModalOpen = useTransitStore((s) => s.setFeedbackModalOpen);
  const setHasUnreadChangelog = useTransitStore((s) => s.setHasUnreadChangelog);

  // When modal opens, mark current version as seen
  useEffect(() => {
    if (isChangelogModalOpen) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CHANGELOG_STORAGE_KEY, APP_VERSION);
      }
      setHasUnreadChangelog(false);
    }
  }, [isChangelogModalOpen, setHasUnreadChangelog]);

  // Handle keyboard ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isChangelogModalOpen) {
        setChangelogModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChangelogModalOpen, setChangelogModalOpen]);

  if (!isChangelogModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setChangelogModalOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-900 dark:text-zinc-100"
      >
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-sky-600/15 via-blue-600/10 to-indigo-600/15 border-b border-slate-200 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => setChangelogModalOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white bg-white/80 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 transition cursor-pointer border border-slate-200/80 dark:border-zinc-700"
            aria-label="Tutup log pembaruan"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 shadow-md shadow-sky-500/25 text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="changelog-modal-title"
                  className="text-base sm:text-lg font-black tracking-tight"
                >
                  Apa yang Baru
                </h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-sky-100 dark:bg-sky-950/90 text-sky-700 dark:text-sky-300 rounded-full border border-sky-300 dark:border-sky-800/70">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Catatan rilis & riwayat pengembangan Jakarta Transit Pulse
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Changelog Timeline */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-700 dark:text-zinc-300">
          {CHANGELOG_ENTRIES.map((entry, index) => {
            const isCurrent = entry.version === APP_VERSION;
            return (
              <div
                key={entry.version}
                className={`relative pl-5 sm:pl-6 border-l-2 ${
                  isCurrent
                    ? 'border-sky-500 dark:border-sky-400'
                    : 'border-slate-200 dark:border-zinc-800'
                } space-y-2.5`}
              >
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full flex items-center justify-center ${
                    isCurrent
                      ? 'bg-sky-500 text-white ring-4 ring-sky-500/20'
                      : 'bg-slate-300 dark:bg-zinc-700'
                  }`}
                >
                  {isCurrent && <CheckCircle2 className="w-2.5 h-2.5" />}
                </div>

                {/* Entry Header */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-sky-500" />
                      {entry.version}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        Versi Saat Ini
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{entry.date}</span>
                  </div>
                </div>

                {/* Entry Title */}
                <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-xs sm:text-sm">
                  {entry.title}
                </h3>

                {/* Change items list */}
                <div className="space-y-2 pt-1">
                  {entry.changes.map((change, cIdx) => (
                    <div
                      key={`${entry.version}_c_${cIdx}`}
                      className="flex items-start gap-2 bg-slate-50 dark:bg-zinc-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-800/80"
                    >
                      <ChangeBadge type={change.type} />
                      <p className="text-[11.5px] leading-relaxed text-slate-700 dark:text-zinc-300 pt-0.5">
                        {change.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-4.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              setChangelogModalOpen(false);
              setFeedbackModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Punya saran atau temuan bug? Beri masukan</span>
          </button>

          <button
            type="button"
            onClick={() => setChangelogModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-zinc-100 transition active:scale-95 cursor-pointer ml-auto"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
