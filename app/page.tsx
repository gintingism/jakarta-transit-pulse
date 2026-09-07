'use client';

import React, { useEffect } from 'react';
import MapWrapper from '@/components/map/MapWrapper';
import FloatingHud from '@/components/alarm/FloatingHud';
import BottomDrawer from '@/components/layout/BottomDrawer';
import GeoAlarmModal from '@/components/alarm/GeoAlarmModal';
import UrlSync from '@/components/UrlSync';
import { useGeoAlert } from '@/hooks/useGeoAlert';
import { useTransitStore } from '@/stores/useTransitStore';
import { initAudioContext } from '@/lib/audio';

export default function HomePage() {
  // Initialize continuous Geolocation Proximity Watcher & Web Audio Alarm Engine
  useGeoAlert();

  const calculateCurrentRoute = useTransitStore((s) => s.calculateCurrentRoute);

  useEffect(() => {
    // Initial calculation for default selected origin & destination
    calculateCurrentRoute();

    // Attach interaction listener to pre-warm Web Audio API context per browser autoplay policies
    const handleFirstInteraction = () => {
      initAudioContext();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [calculateCurrentRoute]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {/* URL Deep-Linking State Synchronizer */}
      <UrlSync />

      {/* Top Floating Diagnostic Status Bar */}
      <FloatingHud />

      {/* Full-Screen Vector Map (CartoDB Dark Matter) */}
      <MapWrapper />

      {/* Responsive Ergonomic Bottom Sheet / Floating Sidebar */}
      <BottomDrawer />

      {/* High-Contrast Proximity Geo-Alarm Alert Modal */}
      <GeoAlarmModal />
    </main>
  );
}
