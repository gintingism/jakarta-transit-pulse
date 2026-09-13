'use client';

import React, { useState, useEffect } from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import { APP_VERSION } from '@/src/data/changelog';
import {
  FeedbackCategory,
  FEEDBACK_CATEGORIES,
} from '@/src/lib/feedbackValidation';
import {
  X,
  MessageSquarePlus,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  MapPin,
  HelpCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string; hint: string }[] = [
  {
    value: 'GPS_NAVIGATION',
    label: 'Masalah Navigasi / GPS',
    hint: 'Akurasi melompat, suara navigasi tidak berbunyi, atau jalur keluar batas.',
  },
  {
    value: 'TRANSIT_ROUTE',
    label: 'Kesalahan Rute Transit',
    hint: 'Stasiun transfer keliru, rute tidak optimal, atau tarif tidak cocok.',
  },
  {
    value: 'FEATURE_REQUEST',
    label: 'Saran Fitur Baru',
    hint: 'Moda baru (Mikrotrans, LRT Jakarta), fitur rute favorit, atau widget.',
  },
  {
    value: 'UI_UX',
    label: 'Desain / Tampilan (UI/UX)',
    hint: 'Tata letak terpotong di HP, kontras warna, atau kenyamanan navigasi.',
  },
  {
    value: 'OTHER',
    label: 'Lainnya',
    hint: 'Pertanyaan umum, apresiasi, atau masukan di luar kategori di atas.',
  },
];

export default function FeedbackModal() {
  const isFeedbackModalOpen = useTransitStore((s) => s.isFeedbackModalOpen);
  const setFeedbackModalOpen = useTransitStore((s) => s.setFeedbackModalOpen);
  const userCoords = useTransitStore((s) => s.userCoords);

  const [category, setCategory] = useState<FeedbackCategory>('GPS_NAVIGATION');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFeedbackModalOpen && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFeedbackModalOpen, isSubmitting]);

  const handleClose = () => {
    if (isSubmitting) return;
    setFeedbackModalOpen(false);
    // Reset state after transition
    setTimeout(() => {
      setMessage('');
      setContact('');
      setCategory('GPS_NAVIGATION');
      setSubmitSuccess(false);
      setErrorMessage(null);
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedMsg = message.trim();
    if (trimmedMsg.length < 5) {
      setErrorMessage('Mohon jelaskan masukan Anda dengan minimal 5 karakter.');
      return;
    }

    setIsSubmitting(true);

    // Light automated context metadata
    const metadata = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      screenResolution:
        typeof window !== 'undefined'
          ? `${window.innerWidth}x${window.innerHeight}`
          : undefined,
      currentPath: typeof window !== 'undefined' ? window.location.pathname : undefined,
      appVersion: APP_VERSION,
      userLocation: userCoords || undefined,
    };

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          message: trimmedMsg,
          contact: contact.trim() || undefined,
          metadata,
        }),
      });

      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        setErrorMessage(
          data.error || 'Gagal mengirim masukan. Silakan periksa jaringan dan coba lagi.'
        );
        setIsSubmitting(false);
        return;
      }

      setSubmitSuccess(true);
      setIsSubmitting(false);
    } catch {
      setErrorMessage(
        'Terjadi kendala jaringan saat menghubungi server. Mohon coba beberapa saat lagi.'
      );
      setIsSubmitting(false);
    }
  };

  if (!isFeedbackModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-zinc-100"
      >
        {/* Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-emerald-600/15 via-teal-600/10 to-sky-600/15 border-b border-slate-200 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white bg-white/80 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 transition cursor-pointer border border-slate-200/80 dark:border-zinc-700 disabled:opacity-50"
            aria-label="Tutup formulir masukan"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-600 shadow-md shadow-emerald-500/25 text-white shrink-0">
              <MessageSquarePlus className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="feedback-modal-title"
                  className="text-base sm:text-lg font-black tracking-tight"
                >
                  Beri Masukan & Lapor Kendala
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Bantu kami menyempurnakan navigasi dan kenyamanan komuter Jakarta
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto p-5 sm:p-6 text-xs text-slate-700 dark:text-zinc-300">
          {submitSuccess ? (
            /* Success View */
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-250">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Masukan Berhasil Terkirim!
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Terima kasih atas bantuan Anda! Setiap laporan dan saran sangat berharga
                  untuk terus mematangkan rute transit dan akurasi Jakarta Transit Pulse.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  Tutup Jendela
                </button>
              </div>
            </div>
          ) : (
            /* Form View */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}

              {/* Category Dropdown */}
              <div className="space-y-1.5">
                <label
                  htmlFor="feedback-category"
                  className="block font-bold text-slate-800 dark:text-zinc-200 text-xs"
                >
                  Kategori Masukan <span className="text-rose-500">*</span>
                </label>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer disabled:opacity-50"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 italic">
                  {CATEGORY_OPTIONS.find((c) => c.value === category)?.hint}
                </p>
              </div>

              {/* Message Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="feedback-message"
                    className="block font-bold text-slate-800 dark:text-zinc-200 text-xs"
                  >
                    Penjelasan Kendala / Saran <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      message.length > 1900
                        ? 'text-rose-500 font-bold'
                        : 'text-slate-400 dark:text-zinc-500'
                    }`}
                  >
                    {message.length}/2000
                  </span>
                </div>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isSubmitting}
                  rows={4}
                  maxLength={2000}
                  placeholder="Ceritakan kendala yang Anda alami secara singkat (contoh: 'Saat transit di Stasiun Manggarai, navigasi suara mengira saya sudah turun...')"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none disabled:opacity-50 leading-relaxed"
                  required
                />
              </div>

              {/* Optional Contact */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="feedback-contact"
                    className="block font-bold text-slate-800 dark:text-zinc-200 text-xs"
                  >
                    Kontak / Identitas Pengirim{' '}
                    <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                </div>
                <input
                  id="feedback-contact"
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={100}
                  placeholder="Email atau username medsos (misal: @username atau nama@email.com)"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                  Isi jika Anda berkenan dihubungi lebih lanjut untuk klarifikasi masalah.
                </p>
              </div>

              {/* Automatic Metadata Notice */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMetadata(!showMetadata)}
                  className="text-[10.5px] text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300 flex items-center gap-1 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {showMetadata ? 'Sembunyikan konteks otomatis' : 'Lihat konteks otomatis yang disertakan'}
                  </span>
                </button>

                {showMetadata && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[10.5px] text-slate-600 dark:text-zinc-400 space-y-1 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="w-3 h-3 text-sky-400" />
                      <span>Versi App: {APP_VERSION}</span>
                    </div>
                    {userCoords && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>
                          GPS Terakhir: {userCoords[0].toFixed(4)}, {userCoords[1].toFixed(4)}
                        </span>
                      </div>
                    )}
                    <div className="text-[9.5px] text-slate-400 dark:text-zinc-500 pt-0.5">
                      Informasi sistem otomatis disematkan murni untuk keperluan debugging teknis.
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Action */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200/80 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || message.trim().length < 5}
                  className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 shadow-md shadow-emerald-600/25 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Masukan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
