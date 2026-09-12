'use client';

import React, { useEffect } from 'react';
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
  useGeoAlert();

  const calculateCurrentRoute = useTransitStore((s) => s.calculateCurrentRoute);
  const isNavigating = useTransitStore((s) => s.isNavigating);
  const navigationLegs = useTransitStore((s) => s.navigationLegs);
  const stopNavigation = useTransitStore((s) => s.stopNavigation);
  const setUserLocation = useTransitStore((s) => s.setUserLocation);

  useEffect(() => {
    calculateCurrentRoute();

    // Resume audio context on first user gesture (browser autoplay policy)
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
      <UrlSync />

      {isNavigating && navigationLegs && navigationLegs.length > 0 ? (
        <NavigationHUD
          legs={navigationLegs}
          onStopNavigation={stopNavigation}
          onPositionUpdate={(pos) => {
            setUserLocation(
              [pos.lat, pos.lng],
              pos.accuracy ?? null,
              pos.heading ?? null,
              pos.speed ?? null
            );
          }}
        />
      ) : (
        <FloatingHud />
      )}

      <MapWrapper />
      {!isNavigating && <BottomDrawer />}
      <GeoAlarmModal />
      <AboutModal />
    </main>
  );
}
