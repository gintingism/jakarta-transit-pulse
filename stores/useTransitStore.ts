'use client';

import { create } from 'zustand';
import {
  Station,
  LineIdentifier,
  STATION_MAP,
} from '@/src/data/transitNetwork';
import {
  RoutePlan,
  PlaceTarget,
  findTransitRoute,
  findDoorToDoorRoute,
  calculateHaversineDistance,
} from '@/src/lib/transitEngine';
import { reverseGeocodeLocation } from '@/src/lib/poiService';
import { RouteLeg, convertRoutePlanToLegs } from '@/src/types/navigation';

export type TabType = 'planner' | 'alarm';
export type RoutePreference = 'FASTEST' | 'CHEAPEST' | 'FEWEST_TRANSFERS';

interface TransitStore {
  // Navigation & Planning
  originStopId: string | null;
  destinationStopId: string | null;
  originPlace: PlaceTarget | null;
  destinationPlace: PlaceTarget | null;
  isRoutingLoading: boolean;
  routePlan: RoutePlan | null;
  selectedLineId: LineIdentifier | 'ALL';
  routePreference: RoutePreference;
  activeTab: TabType;
  isDrawerExpanded: boolean;
  activeSegmentId: string | null;
  setActiveSegmentId: (id: string | null) => void;

  // Map state
  mapCenter: [number, number];
  mapZoom: number;

  // Geolocation & Live Navigation Tracking
  userCoords: [number, number] | null;
  userAccuracy: number | null;
  userHeading: number | null;
  userSpeed: number | null;
  isLocating: boolean;
  isFollowUser: boolean;
  locationError: string | null;

  // Geo-Alarm settings
  alarmTargetStopId: string | null;
  isAlarmArmed: boolean;
  alarmThresholdMeters: number; // default 400m
  currentDistanceMeters: number | null;
  isAlarmTriggered: boolean;
  alarmMuted: boolean;

  // Simulation Mode
  isSimulatingApproach: boolean;
  simApproachProgress: number;

  // Turn-by-Turn Live Navigation
  isNavigating: boolean;
  navigationLegs: RouteLeg[] | null;
  startNavigation: (plan: RoutePlan) => void;
  stopNavigation: () => void;

  // Actions
  setOriginStop: (id: string | null) => void;
  setDestinationStop: (id: string | null) => void;
  setOriginPlace: (place: PlaceTarget | null) => void;
  setDestinationPlace: (place: PlaceTarget | null) => void;
  useCurrentLocationAsOrigin: () => void;
  swapStops: () => void;
  calculateCurrentRoute: () => Promise<void>;
  clearRoute: () => void;
  setSelectedLine: (lineId: LineIdentifier | 'ALL') => void;
  setRoutePreference: (pref: RoutePreference) => void;
  setActiveTab: (tab: TabType) => void;
  toggleDrawer: () => void;
  setDrawerExpanded: (expanded: boolean) => void;
  setMapCenter: (center: [number, number], zoom?: number) => void;
  isAboutModalOpen: boolean;
  setAboutModalOpen: (open: boolean) => void;

  // Location & Alarm actions
  setUserCoords: (coords: [number, number] | null) => void;
  setUserLocation: (
    coords: [number, number],
    accuracy?: number | null,
    heading?: number | null,
    speed?: number | null
  ) => void;
  setIsFollowUser: (follow: boolean) => void;
  toggleFollowUser: () => void;
  setLocationError: (err: string | null) => void;
  armAlarm: (targetStopId?: string) => void;
  disarmAlarm: () => void;
  setAlarmThreshold: (meters: number) => void;
  triggerAlarm: () => void;
  silenceAlarm: () => void;
  dismissAlarm: () => void;
  updateDistanceToTarget: () => void;

  // Simulation controls
  startApproachSimulation: (targetStopId?: string) => void;
  stopApproachSimulation: () => void;
  stepApproachSimulation: (deltaProgress: number) => void;

  // Onboarding Tour
  isTourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;

  // Changelog & Feedback Modals
  isChangelogModalOpen: boolean;
  setChangelogModalOpen: (open: boolean) => void;
  isFeedbackModalOpen: boolean;
  setFeedbackModalOpen: (open: boolean) => void;
  hasUnreadChangelog: boolean;
  setHasUnreadChangelog: (unread: boolean) => void;
}

export const useTransitStore = create<TransitStore>((set, get) => ({
  originStopId: null,
  destinationStopId: null,
  originPlace: {
    name: 'Lokasi Saya Saat Ini',
    coords: [-6.1967, 106.8225],
  },
  destinationPlace: null,
  isRoutingLoading: false,
  routePlan: null,
  selectedLineId: 'ALL',
  routePreference: 'FASTEST',
  activeTab: 'planner',
  isDrawerExpanded: true,
  activeSegmentId: null,
  isAboutModalOpen: false,
  isTourOpen: false,
  isChangelogModalOpen: false,
  isFeedbackModalOpen: false,
  hasUnreadChangelog: false,

  // Live Navigation State
  isNavigating: false,
  navigationLegs: null,
  startNavigation: (plan: RoutePlan) => {
    const legs = convertRoutePlanToLegs(plan);
    if (!legs || legs.length === 0) return;
    set({
      isNavigating: true,
      navigationLegs: legs,
      isDrawerExpanded: false,
      isFollowUser: true,
    });
  },
  stopNavigation: () => {
    set({
      isNavigating: false,
      navigationLegs: null,
      isFollowUser: false,
    });
  },

  mapCenter: [-6.2088, 106.8456],
  mapZoom: 12,

  userCoords: null,
  userAccuracy: null,
  userHeading: null,
  userSpeed: null,
  isLocating: false,
  isFollowUser: false,
  locationError: null,

  alarmTargetStopId: null,
  isAlarmArmed: false,
  alarmThresholdMeters: 400,
  currentDistanceMeters: null,
  isAlarmTriggered: false,
  alarmMuted: false,

  isSimulatingApproach: false,
  simApproachProgress: 0,

  setOriginStop: (id) => {
    const station = id ? STATION_MAP[id] : null;
    const place: PlaceTarget | null = station
      ? { name: station.name, coords: station.coords, stationId: station.id }
      : null;
    set({ originStopId: id, originPlace: place });
    void get().calculateCurrentRoute();
  },

  setDestinationStop: (id) => {
    const station = id ? STATION_MAP[id] : null;
    const place: PlaceTarget | null = station
      ? { name: station.name, coords: station.coords, stationId: station.id }
      : null;
    set({ destinationStopId: id, destinationPlace: place });
    if (id && !get().alarmTargetStopId) {
      set({ alarmTargetStopId: id });
    }
    void get().calculateCurrentRoute();
  },

  setOriginPlace: (place) => {
    set({
      originPlace: place,
      originStopId: place?.stationId || null,
    });
    void get().calculateCurrentRoute();
  },

  setDestinationPlace: (place) => {
    set({
      destinationPlace: place,
      destinationStopId: place?.stationId || null,
    });
    if (place?.stationId && !get().alarmTargetStopId) {
      set({ alarmTargetStopId: place.stationId });
    }
    void get().calculateCurrentRoute();
  },

  useCurrentLocationAsOrigin: () => {
    const coords = get().userCoords;
    if (coords) {
      set({
        originPlace: {
          name: 'Lokasi Saya Saat Ini',
          coords,
        },
        originStopId: null,
      });
      void get().calculateCurrentRoute();
      void reverseGeocodeLocation(coords).then((name) => {
        if (name && name !== 'Lokasi Saya Saat Ini') {
          const current = get().originPlace;
          if (current && current.coords[0] === coords[0] && current.coords[1] === coords[1]) {
            set({ originPlace: { ...current, name } });
          }
        }
      });
      return;
    }

    if (typeof window !== 'undefined' && navigator.geolocation) {
      set({ isLocating: true });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          set({
            userCoords: newCoords,
            isLocating: false,
            originPlace: {
              name: 'Lokasi Saya Saat Ini',
              coords: newCoords,
            },
            originStopId: null,
          });
          void get().calculateCurrentRoute();
          void reverseGeocodeLocation(newCoords).then((name) => {
            if (name && name !== 'Lokasi Saya Saat Ini') {
              const current = get().originPlace;
              if (current && current.coords[0] === newCoords[0] && current.coords[1] === newCoords[1]) {
                set({ originPlace: { ...current, name } });
              }
            }
          });
        },
        () => {
          const fallbackCoords: [number, number] = [-6.1967, 106.8225];
          set({
            userCoords: fallbackCoords,
            isLocating: false,
            originPlace: {
              name: 'Lokasi Saya (Jakarta Pusat)',
              coords: fallbackCoords,
            },
            originStopId: null,
          });
          void get().calculateCurrentRoute();
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  },

  swapStops: () => {
    const { originStopId, destinationStopId, originPlace, destinationPlace } = get();
    set({
      originStopId: destinationStopId,
      destinationStopId: originStopId,
      originPlace: destinationPlace,
      destinationPlace: originPlace,
      alarmTargetStopId: destinationPlace?.stationId || originStopId || null,
    });
    void get().calculateCurrentRoute();
  },

  calculateCurrentRoute: async () => {
    const { originPlace, destinationPlace, originStopId, destinationStopId } = get();

    const effectiveOrigin: PlaceTarget | null =
      originPlace ||
      (originStopId && STATION_MAP[originStopId]
        ? {
            name: STATION_MAP[originStopId].name,
            coords: STATION_MAP[originStopId].coords,
            stationId: originStopId,
          }
        : null);

    const effectiveDest: PlaceTarget | null =
      destinationPlace ||
      (destinationStopId && STATION_MAP[destinationStopId]
        ? {
            name: STATION_MAP[destinationStopId].name,
            coords: STATION_MAP[destinationStopId].coords,
            stationId: destinationStopId,
          }
        : null);

    if (!effectiveOrigin || !effectiveDest) {
      set({ routePlan: null });
      return;
    }

    set({ isRoutingLoading: true });

    try {
      const { routePreference } = get();
      const plan = await findDoorToDoorRoute(effectiveOrigin, effectiveDest, routePreference);
      set({
        routePlan: plan,
        alarmTargetStopId: plan?.destination.id || effectiveDest.stationId || null,
        isRoutingLoading: false,
      });

      if (plan && plan.polylineCoords.length > 0) {
        const firstCoord = plan.polylineCoords[0];
        set({ mapCenter: firstCoord, mapZoom: 13 });
      }
    } catch {
      set({ isRoutingLoading: false });
    }
  },

  clearRoute: () => {
    set({
      originStopId: null,
      destinationStopId: null,
      originPlace: null,
      destinationPlace: null,
      routePlan: null,
      activeSegmentId: null,
    });
  },

  setActiveSegmentId: (id) => set({ activeSegmentId: id }),

  setSelectedLine: (lineId) => set({ selectedLineId: lineId }),
  setRoutePreference: (pref) => {
    set({ routePreference: pref });
    get().calculateCurrentRoute();
  },
  setActiveTab: (tab) => set({ activeTab: tab, isDrawerExpanded: true }),
  toggleDrawer: () => set((state) => ({ isDrawerExpanded: !state.isDrawerExpanded })),
  setDrawerExpanded: (expanded) => set({ isDrawerExpanded: expanded }),
  setMapCenter: (center, zoom) => {
    const current = get().mapCenter;
    const isCenterSame =
      Math.abs(current[0] - center[0]) < 0.00001 &&
      Math.abs(current[1] - center[1]) < 0.00001;
    const isZoomSame = zoom === undefined || zoom === get().mapZoom;

    if (isCenterSame && isZoomSame) {
      return;
    }

    set((state) => ({
      mapCenter: center,
      mapZoom: zoom !== undefined ? zoom : state.mapZoom,
    }));
  },
  setAboutModalOpen: (open) => set({ isAboutModalOpen: open }),
  openTour: () => set({ isTourOpen: true }),
  closeTour: () => set({ isTourOpen: false }),
  setChangelogModalOpen: (open) => set({ isChangelogModalOpen: open }),
  setFeedbackModalOpen: (open) => set({ isFeedbackModalOpen: open }),
  setHasUnreadChangelog: (unread) => set({ hasUnreadChangelog: unread }),

  setUserCoords: (coords) => {
    if (!coords) {
      if (get().userCoords !== null) {
        set({ userCoords: null });
      }
      return;
    }
    const current = get().userCoords;
    if (
      current &&
      Math.abs(current[0] - coords[0]) < 0.00001 &&
      Math.abs(current[1] - coords[1]) < 0.00001
    ) {
      return; // Suppress re-render if position is practically unchanged (< 1.1m)
    }
    set({ userCoords: coords });
    get().updateDistanceToTarget();
  },

  setUserLocation: (coords, accuracy = null, heading = null, speed = null) => {
    if (!coords) {
      set({
        userCoords: null,
        userAccuracy: accuracy ?? null,
        userHeading: heading ?? null,
        userSpeed: speed ?? null,
        locationError: null,
      });
      return;
    }
    const current = get().userCoords;
    const isCoordsSame =
      current &&
      Math.abs(current[0] - coords[0]) < 0.00001 &&
      Math.abs(current[1] - coords[1]) < 0.00001;
    const isHeadingSame = get().userHeading === (heading ?? null);

    if (isCoordsSame && isHeadingSame) {
      return;
    }

    set({
      userCoords: coords,
      userAccuracy: accuracy ?? null,
      userHeading: heading ?? null,
      userSpeed: speed ?? null,
      locationError: null,
    });
    get().updateDistanceToTarget();
  },

  setIsFollowUser: (follow) => set({ isFollowUser: follow }),
  toggleFollowUser: () => set((state) => ({ isFollowUser: !state.isFollowUser })),

  setLocationError: (err) => set({ locationError: err }),

  armAlarm: (targetStopId) => {
    const target = targetStopId || get().destinationStopId || get().alarmTargetStopId;
    if (!target) return;
    set({
      alarmTargetStopId: target,
      isAlarmArmed: true,
      isAlarmTriggered: false,
      alarmMuted: false,
    });
    get().updateDistanceToTarget();
  },

  disarmAlarm: () => {
    set({
      isAlarmArmed: false,
      isAlarmTriggered: false,
      isSimulatingApproach: false,
    });
  },

  setAlarmThreshold: (meters) => {
    set({ alarmThresholdMeters: meters });
    get().updateDistanceToTarget();
  },

  triggerAlarm: () => {
    set({ isAlarmTriggered: true, alarmMuted: false });
  },

  silenceAlarm: () => {
    set({ alarmMuted: true });
  },

  dismissAlarm: () => {
    set({
      isAlarmTriggered: false,
      isAlarmArmed: false,
      isSimulatingApproach: false,
    });
  },

  updateDistanceToTarget: () => {
    const { userCoords, alarmTargetStopId } = get();
    if (!userCoords || !alarmTargetStopId) {
      set({ currentDistanceMeters: null });
      return;
    }

    const targetStation = STATION_MAP[alarmTargetStopId];
    if (!targetStation) return;

    const distance = calculateHaversineDistance(userCoords, targetStation.coords);
    set({ currentDistanceMeters: distance });

    const { isAlarmArmed, alarmThresholdMeters, isAlarmTriggered } = get();
    if (isAlarmArmed && !isAlarmTriggered && distance <= alarmThresholdMeters) {
      get().triggerAlarm();
    }
  },

  startApproachSimulation: (targetStopId) => {
    const targetId = targetStopId || get().alarmTargetStopId || 'tj_harmoni';
    const targetStation = STATION_MAP[targetId];
    if (!targetStation) return;

    const [targetLat, targetLng] = targetStation.coords;
    const startLat = targetLat - 0.015;
    const startLng = targetLng - 0.012;

    set({
      alarmTargetStopId: targetId,
      isAlarmArmed: true,
      isAlarmTriggered: false,
      isSimulatingApproach: true,
      simApproachProgress: 0,
      userCoords: [startLat, startLng],
      mapCenter: [startLat, startLng],
      mapZoom: 14,
    });

    get().updateDistanceToTarget();
  },

  stopApproachSimulation: () => {
    set({ isSimulatingApproach: false });
  },

  stepApproachSimulation: (deltaProgress) => {
    const { isSimulatingApproach, simApproachProgress, alarmTargetStopId } = get();
    if (!isSimulatingApproach || !alarmTargetStopId) return;

    const newProgress = Math.min(1, simApproachProgress + deltaProgress);
    const targetStation = STATION_MAP[alarmTargetStopId];
    if (!targetStation) return;

    const [targetLat, targetLng] = targetStation.coords;
    const startLat = targetLat - 0.015;
    const startLng = targetLng - 0.012;

    const currentLat = startLat + (targetLat - startLat) * newProgress;
    const currentLng = startLng + (targetLng - startLng) * newProgress;

    set({
      simApproachProgress: newProgress,
      userCoords: [currentLat, currentLng],
    });

    get().updateDistanceToTarget();

    if (newProgress >= 1) {
      set({ isSimulatingApproach: false });
    }
  },
}));
