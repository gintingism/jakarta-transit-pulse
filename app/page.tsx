'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import MapWrapper from '@/components/map/MapWrapper';
import FloatingHud from '@/components/alarm/FloatingHud';
import BottomDrawer from '@/components/layout/BottomDrawer';
import GeoAlarmModal from '@/components/alarm/GeoAlarmModal';
import UrlSync from '@/components/UrlSync';
import { useGeoAlert } from '@/hooks/useGeoAlert';
import { useTransitStore } from '@/stores/useTransitStore';
import { initAudioContext } from '@/lib/audio';
import { APP_VERSION, CHANGELOG_STORAGE_KEY } from '@/src/data/changelog';

const NavigationHUD = dynamic(() => import('@/components/navigation/NavigationHUD'), {
  ssr: false,
});
const AboutModal = dynamic(() => import('@/components/AboutModal'), {
  ssr: false,
});
const ChangelogModal = dynamic(() => import('@/components/ChangelogModal'), {
  ssr: false,
});
const FeedbackModal = dynamic(() => import('@/components/FeedbackModal'), {
  ssr: false,
});
const TourCoachmark = dynamic(() => import('@/components/onboarding/TourCoachmark'), {
  ssr: false,
});

export default function HomePage() {
  useGeoAlert();

  const calculateCurrentRoute = useTransitStore((s) => s.calculateCurrentRoute);
  const isNavigating = useTransitStore((s) => s.isNavigating);
  const navigationLegs = useTransitStore((s) => s.navigationLegs);
  const stopNavigation = useTransitStore((s) => s.stopNavigation);
  const setUserLocation = useTransitStore((s) => s.setUserLocation);
  const setHasUnreadChangelog = useTransitStore((s) => s.setHasUnreadChangelog);

  useEffect(() => {
    calculateCurrentRoute();

    // Check if there is an unread changelog / app version update
    if (typeof window !== 'undefined') {
      const lastSeen = localStorage.getItem(CHANGELOG_STORAGE_KEY);
      if (lastSeen !== APP_VERSION) {
        setHasUnreadChangelog(true);
      }
    }

    // Resume audio context on first user gesture (browser autoplay policy)
    const handleFirstInteraction = () => {
      initAudioContext();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });

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
      <ChangelogModal />
      <FeedbackModal />
      <TourCoachmark />
    </main>
  );
}
