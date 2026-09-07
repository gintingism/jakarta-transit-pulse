'use client';

import { useState, useCallback, useMemo } from 'react';
import { Station, STATION_MAP } from '@/src/data/transitNetwork';
import { RoutePlan, findTransitRoute } from '@/src/lib/transitEngine';

export interface UseTransitRouteReturn {
  originId: string | null;
  destinationId: string | null;
  originStation: Station | null;
  destinationStation: Station | null;
  routePlan: RoutePlan | null;
  isCalculating: boolean;
  setOriginId: (id: string | null) => void;
  setDestinationId: (id: string | null) => void;
  swapStations: () => void;
  clearRoute: () => void;
}

/**
 * Custom hook isolating transit route planning state and pure engine traversal.
 */
export function useTransitRoute(
  initialOriginId: string | null = 'krl_bekasi',
  initialDestinationId: string | null = 'tj_harmoni'
): UseTransitRouteReturn {
  const [originId, setOriginIdState] = useState<string | null>(initialOriginId);
  const [destinationId, setDestinationIdState] = useState<string | null>(
    initialDestinationId
  );

  const originStation = useMemo(
    () => (originId ? STATION_MAP[originId] || null : null),
    [originId]
  );

  const destinationStation = useMemo(
    () => (destinationId ? STATION_MAP[destinationId] || null : null),
    [destinationId]
  );

  const routePlan = useMemo(() => {
    if (!originId || !destinationId) return null;
    return findTransitRoute(originId, destinationId);
  }, [originId, destinationId]);

  const setOriginId = useCallback((id: string | null) => {
    setOriginIdState(id);
  }, []);

  const setDestinationId = useCallback((id: string | null) => {
    setDestinationIdState(id);
  }, []);

  const swapStations = useCallback(() => {
    setOriginIdState((prevOrigin) => {
      setDestinationIdState(prevOrigin);
      return destinationId;
    });
  }, [destinationId]);

  const clearRoute = useCallback(() => {
    setOriginIdState(null);
    setDestinationIdState(null);
  }, []);

  return {
    originId,
    destinationId,
    originStation,
    destinationStation,
    routePlan,
    isCalculating: false,
    setOriginId,
    setDestinationId,
    swapStations,
    clearRoute,
  };
}
