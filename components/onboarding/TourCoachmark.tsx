'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTransitStore } from '@/stores/useTransitStore';
import { X, ChevronRight, MapPin, Bell, Navigation, LocateFixed } from 'lucide-react';

const TOUR_STORAGE_KEY = 'has_completed_transit_tour';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-route-input',
    title: 'Cari Rute Perjalanan',
    description:
      'Masukkan stasiun atau tempat asal & tujuan di sini. Bisa ketik nama halte, stasiun KRL, MRT, LRT, atau titik landmark. Klik "Lokasi Saya" untuk pakai GPS otomatis.',
    icon: <Navigation className="w-5 h-5 text-sky-400" />,
    placement: 'right',
  },
  {
    targetId: 'tour-route-results',
    title: 'Pilih Opsi Rute & Tarif',
    description:
      'Setelah rute ditemukan, kartu ini menampilkan estimasi waktu, tarif transit (KRL, MRT, TJ, Bandara), dan pilihan moda. Klik "Mulai Navigasi" untuk masuk mode turn-by-turn real-time.',
    icon: <MapPin className="w-5 h-5 text-emerald-400" />,
    placement: 'right',
  },
  {
    targetId: 'tour-alarm-tab',
    title: 'Geo-Alarm Anti-Bablas',
    description:
      'Buka tab Alarm untuk mengaktifkan geo-alarm. Set stasiun tujuan dan radius (misal 400m) — alarm akan berbunyi kencang saat kamu mendekati stasiun, bahkan saat layar HP mati.',
    icon: <Bell className="w-5 h-5 text-rose-400" />,
    placement: 'top',
  },
  {
    targetId: 'tour-recenter-btn',
    title: 'Ikuti Posisi GPS Live',
    description:
      'Tekan tombol ini untuk mengaktifkan mode "Live Ikuti" — peta akan bergerak otomatis mengikuti posisi GPS kamu secara real-time, mirip Google Maps saat navigasi.',
    icon: <LocateFixed className="w-5 h-5 text-sky-400" />,
    placement: 'bottom',
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PopoverPosition {
  top: number;
  left: number;
}

const PADDING = 10;
const POPOVER_W = 280;
const POPOVER_H_EST = 220;

function computePopoverPos(
  rect: SpotlightRect,
  placement: TourStep['placement'],
  vw: number,
  vh: number
): PopoverPosition {
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'right':
      top = rect.top + rect.height / 2 - POPOVER_H_EST / 2;
      left = rect.left + rect.width + PADDING;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - POPOVER_H_EST / 2;
      left = rect.left - POPOVER_W - PADDING;
      break;
    case 'top':
      top = rect.top - POPOVER_H_EST - PADDING;
      left = rect.left + rect.width / 2 - POPOVER_W / 2;
      break;
    case 'bottom':
      top = rect.top + rect.height + PADDING;
      left = rect.left + rect.width / 2 - POPOVER_W / 2;
      break;
  }

  left = Math.max(PADDING, Math.min(left, vw - POPOVER_W - PADDING));
  top = Math.max(PADDING, Math.min(top, vh - POPOVER_H_EST - PADDING));

  return { top, left };
}

function getArrowStyle(
  placement: TourStep['placement'],
  spotlight: SpotlightRect,
  popover: PopoverPosition
): React.CSSProperties {
  const targetCenterX = spotlight.left + spotlight.width / 2;
  const targetCenterY = spotlight.top + spotlight.height / 2;

  switch (placement) {
    case 'right':
      return {
        top: targetCenterY - popover.top - 6,
        left: -6,
        borderLeft: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'rgb(63 63 70 / 0.8)',
      };
    case 'left':
      return {
        top: targetCenterY - popover.top - 6,
        right: -6,
        borderRight: '1px solid',
        borderTop: '1px solid',
        borderColor: 'rgb(63 63 70 / 0.8)',
      };
    case 'bottom':
      return {
        top: -6,
        left: targetCenterX - popover.left - 6,
        borderTop: '1px solid',
        borderLeft: '1px solid',
        borderColor: 'rgb(63 63 70 / 0.8)',
      };
    case 'top':
    default:
      return {
        bottom: -6,
        left: targetCenterX - popover.left - 6,
        borderBottom: '1px solid',
        borderRight: '1px solid',
        borderColor: 'rgb(63 63 70 / 0.8)',
      };
  }
}

export default function TourCoachmark() {
  const isTourOpen = useTransitStore((s) => s.isTourOpen);
  const closeTour = useTransitStore((s) => s.closeTour);

  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const computeSpotlight = useCallback(
    (targetId: string, idx: number) => {
      const el = document.getElementById(targetId);
      if (!el) return;
      const bcr = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect: SpotlightRect = {
        top: bcr.top - PADDING,
        left: bcr.left - PADDING,
        width: bcr.width + PADDING * 2,
        height: bcr.height + PADDING * 2,
      };
      setSpotlightRect(rect);
      const step = TOUR_STEPS[idx];
      if (step) {
        setPopoverPos(computePopoverPos(rect, step.placement, vw, vh));
      }
    },
    []
  );

  // Auto-start on first visit
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const done = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
    if (!done) {
      const timer = setTimeout(() => {
        setStepIndex(0);
        setVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Open tour from store action (? button)
  useEffect(() => {
    if (isTourOpen) {
      setStepIndex(0);
      setVisible(true);
    }
  }, [isTourOpen]);

  // Track target position
  useEffect(() => {
    if (stepIndex === null || !visible) return;
    const step = TOUR_STEPS[stepIndex];
    if (!step) return;

    computeSpotlight(step.targetId, stepIndex);

    const el = document.getElementById(step.targetId);
    if (el && typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current?.disconnect();
      const ro = new ResizeObserver(() => computeSpotlight(step.targetId, stepIndex));
      ro.observe(el);
      resizeObserverRef.current = ro;
    }

    const handleResize = () => computeSpotlight(step.targetId, stepIndex);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserverRef.current?.disconnect();
    };
  }, [stepIndex, visible, computeSpotlight]);

  const completeTour = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }
    setVisible(false);
    setStepIndex(null);
    setSpotlightRect(null);
    closeTour();
  }, [closeTour]);

  const handleNext = useCallback(() => {
    if (stepIndex === null) return;
    if (stepIndex < TOUR_STEPS.length - 1) {
      setSpotlightRect(null);
      setStepIndex(stepIndex + 1);
    } else {
      completeTour();
    }
  }, [stepIndex, completeTour]);

  const handleSkip = useCallback(() => {
    completeTour();
  }, [completeTour]);

  if (!visible || stepIndex === null) return null;

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const progress = stepIndex + 1;
  const total = TOUR_STEPS.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-auto"
        style={{ background: 'rgba(0,0,0,0.0)' }}
        onClick={handleSkip}
        aria-hidden="true"
      >
        {spotlightRect && (
          <div
            style={{
              position: 'absolute',
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
              borderRadius: '12px',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
              pointerEvents: 'none',
              transition: 'top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease',
            }}
          />
        )}
      </div>

      {/* Popover */}
      <div
        className="fixed z-[9999] pointer-events-auto"
        style={{
          top: popoverPos.top,
          left: popoverPos.left,
          width: POPOVER_W,
          transition: 'top 0.25s ease, left 0.25s ease',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Panduan langkah ${progress} dari ${total}: ${step.title}`}
      >
        {/* Arrow */}
        {spotlightRect && (
          <div
            className="absolute w-3 h-3 bg-zinc-900 rotate-45"
            style={getArrowStyle(step.placement, spotlightRect, popoverPos)}
          />
        )}

        <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              {step.icon}
              <span className="text-sm font-bold text-white leading-tight">{step.title}</span>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="text-zinc-500 hover:text-zinc-300 transition shrink-0 mt-0.5 cursor-pointer"
              aria-label="Lewati panduan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-3">
            <p className="text-xs text-zinc-300 leading-relaxed">{step.description}</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 px-4 pb-4">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === stepIndex
                      ? 'bg-sky-400'
                      : i < stepIndex
                      ? 'bg-zinc-500'
                      : 'bg-zinc-700'
                  }`}
                />
              ))}
              <span className="text-[10px] text-zinc-500 ml-1 font-mono">
                {progress}/{total}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!isLast && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                >
                  Lewati
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer active:scale-95 ${
                  isLast
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                    : 'bg-sky-500 hover:bg-sky-400 text-white'
                }`}
              >
                {isLast ? (
                  'Selesai'
                ) : (
                  <>
                    Lanjut
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
