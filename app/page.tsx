'use client';

import React, { useEffect, useCallback } from 'react';
import MapWrapper from '@/components/map/MapWrapper';
import FloatingHud from '@/components/alarm/FloatingHud';
import BottomDrawer from '@/components/layout/BottomDrawer';
import GeoAlarmModal from '@/components/alarm/GeoAlarmModal';
import AboutModal from '@/components/AboutModal';
import UrlSync from '@/components/UrlSync';
import NavigationHUD from '@/components/navigation/NavigationHUD';
import { useGeoAlert } from '@/hooks/useGeoAlert';
import { useTransitStore } from '@/stores/useTransitStore';
import { initAudioContext } from '@/lib/audio';

export default function HomePage() {
  // Initialize continuous Geolocation Proximity Watcher & Web Audio Alarm Engine
  useGeoAlert();

  const calculateCurrentRoute = useTransitStore((s) => s.calculateCurrentRoute);
  const isNavigating = useTransitStore((s) => s.isNavigating);
  const navigationLegs = useTransitStore((s) => s.navigationLegs);
  const stopNavigation = useTransitStore((s) => s.stopNavigation);
  const setUserCoords = useTransitStore((s) => s.setUserCoords);
  const setMapCenter = useTransitStore((s) => s.setMapCenter);

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

  const handlePositionUpdate = useCallback(
    (pos: { lat: number; lng: number }) => {
      if (
        pos &&
        typeof pos.lat === 'number' &&
        typeof pos.lng === 'number' &&
        !isNaN(pos.lat) &&
        !isNaN(pos.lng)
      ) {
        // Pure GPS tracking update; map panning during follow mode is handled by MapFollowController
        setUserCoords([pos.lat, pos.lng]);
      }
    },
    [setUserCoords]
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {/* URL Deep-Linking State Synchronizer */}
      <UrlSync />

      {/* Turn-by-Turn GPS Navigation HUD (Active Mode) */}
      {isNavigating && navigationLegs && navigationLegs.length > 0 ? (
        <NavigationHUD
          legs={navigationLegs}
          onStopNavigation={stopNavigation}
          onPositionUpdate={handlePositionUpdate}
        />
      ) : (
        /* Top Floating Diagnostic Status Bar (Idle Mode) */
        <FloatingHud />
      )}

      {/* Full-Screen Vector Map (CartoDB Dark Matter) */}
      <MapWrapper />

      {/* Responsive Ergonomic Bottom Sheet / Floating Sidebar */}
      <BottomDrawer />

      {/* High-Contrast Proximity Geo-Alarm Alert Modal */}
      <GeoAlarmModal />

      {/* Professional About Developer & Copyright Modal */}
      <AboutModal />
    </main>
  );
}
