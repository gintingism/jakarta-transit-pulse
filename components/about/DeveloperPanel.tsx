'use client';

import React from 'react';
import {
  Linkedin,
  Github,
  ExternalLink,
  MapPin,
  Sparkles,
  Code2,
  Heart,
  Train,
  Bell,
  ShieldCheck,
  Star,
  Compass,
} from 'lucide-react';

export const DEVELOPER_PROFILE = {
  name: 'Bonifasius Totoneguisa Ginting',
  handle: '@gintingism',
  role: 'Software Engineer & Creator of Jakarta Transit Pulse',
  location: 'Jakarta, Indonesia',
  status: 'Open to Opportunities & Collaborations',
  linkedinUrl: 'https://www.linkedin.com/in/bonifasiustotoneguisaginting/',
  githubUrl: 'https://github.com/gintingism',
  repoUrl: 'https://github.com/gintingism/jakarta-transit-pulse',
};

export default function DeveloperPanel() {
  return (
    <div className="space-y-4 text-slate-800 dark:text-zinc-200 animate-in fade-in duration-200">
      {/* Executive Profile Card */}
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl">
        {/* Background Banner Accent */}
        <div className="h-20 sm:h-24 bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-semibold border border-white/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Aktif Terbuka</span>
          </div>
        </div>

        {/* Profile Content Details */}
        <div className="px-4 pb-5 pt-0 relative">
          {/* Avatar with glowing ring */}
          <div className="-mt-10 sm:-mt-12 flex items-end justify-between mb-3">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 border-4 border-white dark:border-zinc-900 shadow-xl flex items-center justify-center text-white font-black text-2xl sm:text-3xl">
                BG
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-white text-xs shadow-md"
                title="Verified Creator"
              >
                ✓
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>{DEVELOPER_PROFILE.location}</span>
            </div>
          </div>

          {/* Name & Headline */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {DEVELOPER_PROFILE.name}
              </h2>
              <span className="text-xs font-mono font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                {DEVELOPER_PROFILE.handle}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-zinc-300 leading-snug">
              {DEVELOPER_PROFILE.role}
            </p>
          </div>

          {/* Primary Professional CTA Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            {/* LinkedIn CTA Button */}
            <a
              href={DEVELOPER_PROFILE.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-white font-bold text-xs shadow-md shadow-[#0a66c2]/25 transition hover:scale-[1.02] active:scale-95 cursor-pointer"
              title="Kunjungi dan Konek di Profil LinkedIn"
            >
              <Linkedin className="w-4 h-4 fill-current shrink-0" />
              <span>Connect di LinkedIn</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-80" />
            </a>

            {/* GitHub Profile CTA Button */}
            <a
              href={DEVELOPER_PROFILE.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 dark:hover:bg-zinc-700 text-white font-bold text-xs border border-slate-700 dark:border-zinc-700 shadow-md transition hover:scale-[1.02] active:scale-95 cursor-pointer"
              title="Kunjungi Profil GitHub @gintingism"
            >
              <Github className="w-4 h-4 shrink-0" />
              <span>Kunjungi GitHub</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-80" />
            </a>
          </div>
        </div>
      </div>

      {/* About Me Story & Project Motivation */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-2.5 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Tentang Saya & Latar Belakang Proyek</span>
        </div>

        <p className="text-slate-600 dark:text-zinc-300 leading-relaxed text-[11px]">
          Halo! Saya seorang software engineer yang setiap hari mengandalkan transportasi umum di kawasan Jabodetabek. Aplikasi ini lahir dari pengalaman pribadi: lelah menghadapi labirin transit antar moda, tarif ojol yang melonjak tajam saat jam sibuk, dan kekhawatiran bablas ketiduran di kereta setelah seharian bekerja.
        </p>

        <p className="text-slate-600 dark:text-zinc-300 leading-relaxed text-[11px]">
          <strong>Jakarta Transit Pulse (AntiBablas)</strong> dibangun mandiri dengan komitmen kualitas tinggi: antarmuka bersih tanpa iklan, logika tarif transparan, navigasi GPS real-time seakurat Google Maps, dan alarm kedatangan Web Audio API yang tidak bergantung pada unduhan audio eksternal.
        </p>

        {/* GitHub Star & Repository Card */}
        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-500" />
            <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
              Open Source Repository
            </span>
          </div>

          <a
            href={DEVELOPER_PROFILE.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900 transition text-[11px] font-bold"
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Star di GitHub</span>
          </a>
        </div>
      </div>

      {/* Engineering Highlights Grid */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
          <Code2 className="w-4 h-4 text-sky-500" />
          <span>Spesifikasi & Standar Rekayasa</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200">
              <Train className="w-3.5 h-3.5 text-sky-500" />
              <span>5 Moda Terintegrasi</span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-[10px] leading-snug">
              KRL, TransJakarta Koridor 1, MRT, LRT Jabodebek, & KA Bandara.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200">
              <Bell className="w-3.5 h-3.5 text-rose-500" />
              <span>GPS Alarm & Live Follow</span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-[10px] leading-snug">
              Hardware tracking tanpa cache, watchdog recovery, & synth chime.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero Any TypeScript</span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-[10px] leading-snug">
              Strict typing dengan 83 automated unit test via Vitest (100% lulus).
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>100% Bebas Iklan</span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-[10px] leading-snug">
              Performa cepat & ringan untuk pejuang komuter Jabodetabek.
            </p>
          </div>
        </div>
      </div>

      {/* Footer & Copyright Note */}
      <div className="text-center text-[11px] text-slate-400 dark:text-zinc-500 py-1 space-y-0.5">
        <div>&copy; {new Date().getFullYear()} Jakarta Transit Pulse by {DEVELOPER_PROFILE.name} ({DEVELOPER_PROFILE.handle})</div>
        <div className="text-[10px]">Open source di bawah Lisensi MIT. Terbuka untuk diskusi & kolaborasi.</div>
      </div>
    </div>
  );
}
