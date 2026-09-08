'use client';

import React, { useEffect } from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import {
  X,
  Compass,
  Linkedin,
  Github,
  ExternalLink,
  Code2,
  ShieldCheck,
  Heart,
  Train,
  Bell,
  Leaf,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const DEVELOPER_CONFIG = {
  name: 'Bonifasius Toto Neguisa Ginting',
  handle: '@gintingism',
  title: 'Software Engineer & Creator of Jakarta Transit Pulse',
  location: 'Jakarta, Indonesia',
  status: 'Open to Opportunities & Collaborations',
  bio: 'Membangun aplikasi navigasi transit modern dan geo-alarm cerdas untuk membantu pejuang komuter Jabodetabek agar tidak bablas ketiduran di jalan.',
  story:
    'Aplikasi ini lahir dari pengalaman pribadi: lelah menghadapi labirin transit antar moda, tarif ojol yang melonjak tajam saat jam sibuk, dan kekhawatiran bablas ketiduran di kereta setelah seharian bekerja. Dibangun mandiri dengan standar rekayasa modern tanpa iklan.',
  linkedinUrl: 'https://www.linkedin.com/in/bonifasiustotoneguisaginting/',
  githubUrl: 'https://github.com/gintingism',
  repoUrl: 'https://github.com/gintingism/jakarta-transit-pulse',
};

export default function AboutModal() {
  const isAboutModalOpen = useTransitStore((s) => s.isAboutModalOpen);
  const setAboutModalOpen = useTransitStore((s) => s.setAboutModalOpen);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAboutModalOpen) {
        setAboutModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAboutModalOpen, setAboutModalOpen]);

  if (!isAboutModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setAboutModalOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-zinc-100"
      >
        {/* Header with gradient branding banner */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-sky-600/15 via-blue-600/10 to-indigo-600/15 border-b border-slate-200 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => setAboutModalOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white bg-white/80 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 transition cursor-pointer border border-slate-200/80 dark:border-zinc-700"
            aria-label="Tutup jendela informasi"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 shadow-lg shadow-sky-500/25 text-white shrink-0">
              <Compass className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 id="about-modal-title" className="text-base sm:text-lg font-black tracking-tight">
                  Jakarta Transit Pulse
                </h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800/60 font-mono">
                  AntiBablas
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Modern Multi-Modal Transit Planner & GPS Geo-Alarm
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
          {/* Executive Developer Card */}
          <div className="relative overflow-hidden bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
            {/* Status Pill & Location */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{DEVELOPER_CONFIG.location}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>{DEVELOPER_CONFIG.status}</span>
              </div>
            </div>

            {/* Avatar & Core Profile Info */}
            <div className="flex items-center gap-3 pt-1">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md ring-2 ring-sky-500/30">
                  BG
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-white text-[10px] font-bold shadow-xs"
                  title="Verified Creator"
                >
                  ✓
                </div>
              </div>

              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                    {DEVELOPER_CONFIG.name}
                  </h3>
                  <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                    {DEVELOPER_CONFIG.handle}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium leading-snug">
                  {DEVELOPER_CONFIG.title}
                </p>
              </div>
            </div>

            <p className="text-slate-600 dark:text-zinc-300 text-[11px] leading-relaxed">
              {DEVELOPER_CONFIG.bio}
            </p>

            {/* Primary Action Buttons: LinkedIn & GitHub */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-zinc-800/80">
              <a
                href={DEVELOPER_CONFIG.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#0a66c2] hover:bg-[#004182] text-white font-bold text-xs shadow-sm transition hover:scale-[1.02] active:scale-95 text-center cursor-pointer"
                title="Kunjungi dan Konek di Profil LinkedIn"
              >
                <Linkedin className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>Connect di LinkedIn</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-80" />
              </a>

              <a
                href={DEVELOPER_CONFIG.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 dark:hover:bg-zinc-700 text-white font-bold text-xs border border-slate-700 dark:border-zinc-700 transition hover:scale-[1.02] active:scale-95 text-center cursor-pointer"
                title="Kunjungi Profil GitHub @gintingism"
              >
                <Github className="w-3.5 h-3.5 shrink-0" />
                <span>Profil GitHub</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-80" />
              </a>
            </div>
          </div>

          {/* Project Backstory */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-zinc-200 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Latar Belakang & Visi Proyek</span>
            </div>
            <p className="text-slate-600 dark:text-zinc-300 text-[11px] leading-relaxed">
              {DEVELOPER_CONFIG.story}
            </p>
          </div>

          {/* Core Technical Highlights */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-sky-500" />
              <span>Arsitektur & Spesifikasi Teknik</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/90 space-y-1">
                <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200">
                  <Train className="w-3.5 h-3.5 text-sky-500" />
                  <span>5 Moda Transit</span>
                </div>
                <p className="text-slate-500 dark:text-zinc-400 text-[10px]">
                  KRL, TransJakarta (Koridor 1 & bertahap), MRT, LRT, & KA Bandara.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/90 space-y-1">
                <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200">
                  <Bell className="w-3.5 h-3.5 text-rose-500" />
                  <span>GPS Geo-Alarm</span>
                </div>
                <p className="text-slate-500 dark:text-zinc-400 text-[10px]">
                  Procedural Web Audio API synth alarm, hemat kuota & bebas putus sinyal.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/90 space-y-1">
                <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Zero Any TypeScript</span>
                </div>
                <p className="text-slate-500 dark:text-zinc-400 text-[10px]">
                  Strict typing dengan 83 unit test otomatis via Vitest (100% lolos).
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/90 space-y-1">
                <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200">
                  <Leaf className="w-3.5 h-3.5 text-teal-500" />
                  <span>Eco & Budget Impact</span>
                </div>
                <p className="text-slate-500 dark:text-zinc-400 text-[10px]">
                  Hitungan penghematan vs ojol (Kepmenhub Zona II) & reduksi emisi CO₂.
                </p>
              </div>
            </div>
          </div>

          {/* Project Repository Link */}
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sky-900 dark:text-sky-300">
              <Github className="w-4 h-4 shrink-0" />
              <div className="text-[11px]">
                <div className="font-bold">Kode Sumber Terbuka (Open Source)</div>
                <div className="text-[10px] text-sky-700 dark:text-sky-400">
                  github.com/gintingism/jakarta-transit-pulse
                </div>
              </div>
            </div>
            <a
              href={DEVELOPER_CONFIG.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] transition shrink-0 flex items-center gap-1"
            >
              <span>Bintang Repo</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer with Copyright Notice */}
        <div className="p-4 bg-slate-100/80 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 text-center text-[11px] text-slate-500 dark:text-zinc-400 space-y-1">
          <div className="flex items-center justify-center gap-1 font-medium">
            <span>Dibuat dengan</span>
            <Heart className="w-3 h-3 text-rose-500 fill-current inline" />
            <span>untuk para pejuang komuter Jabodetabek</span>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-zinc-500">
            &copy; {new Date().getFullYear()} Jakarta Transit Pulse by{' '}
            <span className="font-semibold text-slate-600 dark:text-zinc-300">
              {DEVELOPER_CONFIG.name} ({DEVELOPER_CONFIG.handle})
            </span>
            . Dilindungi Lisensi MIT.
          </div>
        </div>
      </div>
    </div>
  );
}
