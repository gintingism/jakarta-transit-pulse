'use client';

import { useEffect, useRef } from 'react';
import { useTransitStore, RoutePreference } from '@/stores/useTransitStore';
import { STATION_MAP } from '@/src/data/transitNetwork';

export default function UrlSync() {
  const originStopId = useTransitStore((s) => s.originStopId);
  const destinationStopId = useTransitStore((s) => s.destinationStopId);
  const originPlace = useTransitStore((s) => s.originPlace);
  const destinationPlace = useTransitStore((s) => s.destinationPlace);
  const routePreference = useTransitStore((s) => s.routePreference);
  const setOriginStop = useTransitStore((s) => s.setOriginStop);
  const setDestinationStop = useTransitStore((s) => s.setDestinationStop);
  const setOriginPlace = useTransitStore((s) => s.setOriginPlace);
  const setDestinationPlace = useTransitStore((s) => s.setDestinationPlace);
  const setRoutePreference = useTransitStore((s) => s.setRoutePreference);
  const calculateCurrentRoute = useTransitStore((s) => s.calculateCurrentRoute);

  const isInitialized = useRef(false);

  // 1. On Mount: Parse URL parameters and hydrate store
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('from') || params.get('origin');
    const toParam = params.get('to') || params.get('dest');
    const prefParam = params.get('pref');

    let hasParamUpdates = false;

    if (prefParam && ['FASTEST', 'CHEAPEST', 'FEWEST_TRANSFERS'].includes(prefParam)) {
      setRoutePreference(prefParam as RoutePreference);
      hasParamUpdates = true;
    }

    if (fromParam) {
      hasParamUpdates = true;
      if (STATION_MAP[fromParam]) {
        setOriginStop(fromParam);
      } else {
        setOriginPlace({ name: fromParam, coords: [-6.1967, 106.8225] });
      }
    }

    if (toParam) {
      hasParamUpdates = true;
      if (STATION_MAP[toParam]) {
        setDestinationStop(toParam);
      } else {
        setDestinationPlace({ name: toParam, coords: [-6.1754, 106.8272] });
      }
    }

    isInitialized.current = true;

    if (hasParamUpdates) {
      void calculateCurrentRoute();
    }
  }, [setOriginStop, setDestinationStop, setOriginPlace, setDestinationPlace, setRoutePreference, calculateCurrentRoute]);

  // 2. On State Change: Update URL query parameters without page reload
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized.current) return;

    const url = new URL(window.location.href);
    const fromVal = originStopId || originPlace?.name;
    const toVal = destinationStopId || destinationPlace?.name;

    if (fromVal) {
      url.searchParams.set('from', fromVal);
    } else {
      url.searchParams.delete('from');
    }

    if (toVal) {
      url.searchParams.set('to', toVal);
    } else {
      url.searchParams.delete('to');
    }

    if (routePreference) {
      url.searchParams.set('pref', routePreference);
    }

    window.history.replaceState(null, '', url.toString());
  }, [originStopId, destinationStopId, originPlace, destinationPlace, routePreference]);

  return null;
}
