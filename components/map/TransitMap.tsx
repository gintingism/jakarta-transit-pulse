'use client';

import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Circle,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  STATIONS,
  TRANSIT_LINES,
  STATION_MAP,
  Station,
  LineIdentifier,
} from '@/src/data/transitNetwork';
import { RoutePlan } from '@/src/lib/transitEngine';
import { useTheme } from 'next-themes';
import { useTransitStore } from '@/stores/useTransitStore';
import {
  Plus,
  Minus,
  Maximize2,
  LocateFixed,
  Loader2,
  RotateCcw,
  Focus,
} from 'lucide-react';

interface TransitMapProps {
  routePlan?: RoutePlan | null;
  originId?: string | null;
  destinationId?: string | null;
  userCoords?: [number, number] | null;
  alarmTargetId?: string | null;
  alarmThresholdMeters?: number;
  isAlarmArmed?: boolean;
  selectedLineFilter?: LineIdentifier | 'ALL';
  onSelectStation?: (stationId: string, role: 'origin' | 'dest') => void;
  onSetAlarm?: (stationId: string) => void;
}

// Map bounds controller for computed routes
function MapBoundsController({
  routePlan,
}: {
  routePlan?: RoutePlan | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routePlan) {
      const allCoords: [number, number][] = [...routePlan.polylineCoords];
      if (routePlan.walkingPolylineCoords) {
        routePlan.walkingPolylineCoords.forEach((leg) => {
          allCoords.push(...leg);
        });
      }
      if (allCoords.length > 1) {
        const bounds = L.latLngBounds(
          allCoords.map(([lat, lng]) => [lat, lng])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [map, routePlan]);

  return null;
}

// Map center controller watching store updates
function MapCenterController() {
  const map = useMap();
  const mapCenter = useTransitStore((s) => s.mapCenter);
  const mapZoom = useTransitStore((s) => s.mapZoom);

  useEffect(() => {
    map.flyTo(mapCenter, mapZoom, { duration: 1.2 });
  }, [map, mapCenter, mapZoom]);

  return null;
}

// Live Navigation Follow Controller (Google Maps style)
function MapFollowController() {
  const map = useMap();
  const userCoords = useTransitStore((s) => s.userCoords);
  const isFollowUser = useTransitStore((s) => s.isFollowUser);
  const setIsFollowUser = useTransitStore((s) => s.setIsFollowUser);
  const lastPanRef = React.useRef<[number, number] | null>(null);

  // When commuter manually drags the map, disengage auto-follow smoothly
  useEffect(() => {
    const handleDragStart = () => {
      if (useTransitStore.getState().isFollowUser) {
        setIsFollowUser(false);
      }
    };
    map.on('dragstart', handleDragStart);
    return () => {
      map.off('dragstart', handleDragStart);
    };
  }, [map, setIsFollowUser]);

  // Continuously and smoothly pan to user location when follow mode is active
  useEffect(() => {
    if (isFollowUser && userCoords) {
      const last = lastPanRef.current;
      if (
        !last ||
        Math.abs(last[0] - userCoords[0]) >= 0.00001 ||
        Math.abs(last[1] - userCoords[1]) >= 0.00001
      ) {
        lastPanRef.current = userCoords;
        map.panTo(userCoords, { animate: true, duration: 0.8, easeLinearity: 0.25 });
      }
    }
  }, [map, userCoords, isFollowUser]);

  return null;
}

// Segment focus controller: smoothly zooms and pans to selected leg
function SegmentFocusController({ routePlan }: { routePlan?: RoutePlan | null }) {
  const map = useMap();
  const activeSegmentId = useTransitStore((s) => s.activeSegmentId);

  useEffect(() => {
    if (!activeSegmentId || !routePlan) return;

    let targetCoords: [number, number][] | undefined;

    if (activeSegmentId === 'first-mile' && routePlan.firstMileWalk) {
      targetCoords = routePlan.firstMileWalk.polylineCoords;
    } else if (activeSegmentId === 'last-mile' && routePlan.lastMileWalk) {
      targetCoords = routePlan.lastMileWalk.polylineCoords;
    } else {
      const seg = routePlan.segments.find(
        (s, i) => s.id === activeSegmentId || `seg-${i}` === activeSegmentId
      );
      if (seg && seg.polylineCoords && seg.polylineCoords.length > 0) {
        targetCoords = seg.polylineCoords;
      }
    }

    if (targetCoords && targetCoords.length > 0) {
      if (targetCoords.length === 1) {
        map.flyTo(targetCoords[0], 16, { duration: 1.2 });
      } else {
        const bounds = L.latLngBounds(targetCoords.map(([lat, lng]) => [lat, lng]));
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
      }
    }
  }, [map, activeSegmentId, routePlan]);

  return null;
}

// Right-side floating map controls (Zoom In, Zoom Out, Fit Route, Locate Me, Reset Segment Focus)
function MapFloatingControls({ routePlan }: { routePlan?: RoutePlan | null }) {
  const map = useMap();
  const userCoords = useTransitStore((s) => s.userCoords);
  const useCurrentLocationAsOrigin = useTransitStore((s) => s.useCurrentLocationAsOrigin);
  const isLocating = useTransitStore((s) => s.isLocating);
  const activeSegmentId = useTransitStore((s) => s.activeSegmentId);
  const setActiveSegmentId = useTransitStore((s) => s.setActiveSegmentId);
  const isFollowUser = useTransitStore((s) => s.isFollowUser);
  const setIsFollowUser = useTransitStore((s) => s.setIsFollowUser);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    map.zoomIn();
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    map.zoomOut();
  };

  const handleFitJourney = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowUser(false);
    if (activeSegmentId) {
      setActiveSegmentId(null);
    }
    if (routePlan && routePlan.polylineCoords.length > 0) {
      const allCoords: [number, number][] = [...routePlan.polylineCoords];
      if (routePlan.walkingPolylineCoords) {
        routePlan.walkingPolylineCoords.forEach((leg) => allCoords.push(...leg));
      }
      map.fitBounds(L.latLngBounds(allCoords.map(([lat, lng]) => [lat, lng])), {
        padding: [60, 60],
        maxZoom: 15,
      });
    } else {
      map.flyTo([-6.2088, 106.8456], 12, { duration: 1.2 });
    }
  };

  const handleLocateUser = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userCoords) {
      setIsFollowUser(true);
      map.flyTo(userCoords, 16, { duration: 0.8 });
    } else {
      useCurrentLocationAsOrigin();
      setIsFollowUser(true);
    }
  };

  return (
    <div className="absolute top-20 right-3.5 sm:right-4 z-[990] flex flex-col gap-2 pointer-events-auto">
      {/* Zoom In/Out Stack */}
      <div className="flex flex-col rounded-2xl bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-xl overflow-hidden divide-y divide-slate-200/80 dark:divide-zinc-800/80">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2.5 text-slate-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 transition cursor-pointer active:scale-95"
          title="Perbesar Peta (+)"
          aria-label="Perbesar Peta"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2.5 text-slate-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 transition cursor-pointer active:scale-95"
          title="Perkecil Peta (-)"
          aria-label="Perkecil Peta"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Focus & Locate Stack */}
      <div className="flex flex-col rounded-2xl bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-xl overflow-hidden divide-y divide-slate-200/80 dark:divide-zinc-800/80">
        <button
          type="button"
          onClick={handleFitJourney}
          className="p-2.5 text-slate-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 transition cursor-pointer active:scale-95"
          title="Fokus Seluruh Rute / Reset Tampilan"
          aria-label="Fokus Seluruh Rute"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleLocateUser}
          disabled={isLocating}
          className={`p-2.5 transition cursor-pointer active:scale-95 disabled:opacity-50 ${
            isFollowUser
              ? 'bg-sky-500 text-white hover:bg-sky-600'
              : 'text-slate-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80'
          }`}
          title={isFollowUser ? 'Mode Ikuti Posisi Aktif' : 'Pusatkan & Ikuti Lokasi Saya'}
          aria-label="Pusatkan dan Ikuti Lokasi Saya"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
          ) : (
            <LocateFixed className={`w-4 h-4 ${isFollowUser ? 'animate-pulse' : ''}`} />
          )}
        </button>

        {/* Quick Segment Reset Pill */}
        {activeSegmentId && (
          <button
            type="button"
            onClick={() => setActiveSegmentId(null)}
            className="p-2.5 bg-sky-500 hover:bg-sky-600 text-white transition cursor-pointer active:scale-95 flex items-center justify-center"
            title="Reset Sorotan Segmen"
            aria-label="Reset Sorotan Segmen"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Generate Station Marker Icon
function createStationIcon(
  station: Station,
  isOrigin: boolean,
  isDest: boolean,
  isTransfer: boolean
) {
  if (isOrigin) {
    return L.divIcon({
      className: 'custom-station-icon',
      html: `
        <div class="relative flex items-center justify-center" style="width:24px;height:24px;">
          <span class="absolute -inset-1 rounded-full bg-emerald-500/40 animate-ping"></span>
          <div style="width:20px;height:20px;border-radius:50%;background:#09090b;border:3px solid #10b981;box-shadow:0 0 10px rgba(16,185,129,0.7);display:flex;align-items:center;justify-content:center;">
            <div style="width:6px;height:6px;border-radius:50%;background:#10b981;"></div>
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });
  }

  if (isDest) {
    return L.divIcon({
      className: 'custom-station-icon',
      html: `
        <div class="relative flex items-center justify-center" style="width:24px;height:24px;">
          <span class="absolute -inset-1 rounded-full bg-sky-500/40 animate-ping"></span>
          <div style="width:20px;height:20px;border-radius:50%;background:#09090b;border:3px solid #0284c7;box-shadow:0 0 10px rgba(2,132,199,0.7);display:flex;align-items:center;justify-content:center;">
            <div style="width:6px;height:6px;border-radius:50%;background:#0284c7;"></div>
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });
  }

  if (station.isInterchange || isTransfer) {
    return L.divIcon({
      className: 'custom-station-icon',
      html: `
        <div class="relative flex items-center justify-center cursor-pointer hover:scale-125 transition-transform" style="width:16px;height:16px;">
          <div style="width:16px;height:16px;border-radius:50%;background:#ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;">
            <div style="width:8px;height:8px;border-radius:50%;background:#18181b;border:2px solid #ffffff;"></div>
          </div>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    });
  }

  const primaryLineColor =
    (station.lines[0] && TRANSIT_LINES[station.lines[0]]?.color) || '#3b82f6';

  return L.divIcon({
    className: 'custom-station-icon',
    html: `
      <div class="flex items-center justify-center cursor-pointer hover:scale-125 transition-transform" style="width:10px;height:10px;">
        <div style="width:10px;height:10px;border-radius:50%;background:#18181b;border:2px solid ${primaryLineColor};box-shadow:0 1px 3px rgba(0,0,0,0.5);"></div>
      </div>
    `,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    popupAnchor: [0, -5],
  });
}

// User GPS live navigation marker icon (with optional heading beam & pulsing halo)
function createUserMarkerIcon(heading: number | null) {
  const rotationStyle =
    heading !== null && !isNaN(heading)
      ? `transform: rotate(${Math.round(heading)}deg); transform-origin: center center;`
      : '';

  return L.divIcon({
    className: 'custom-user-live-icon',
    html: `
      <div class="relative flex items-center justify-center" style="width:36px;height:36px;transition:transform 0.4s ease-out;">
        ${
          heading !== null && !isNaN(heading)
            ? `
          <div style="position:absolute;top:0;left:0;width:36px;height:36px;pointer-events:none;${rotationStyle}">
            <div style="position:absolute;top:1px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:12px solid rgba(59,130,246,0.9);filter:drop-shadow(0 0 3px rgba(59,130,246,0.8));"></div>
          </div>
        `
            : ''
        }
        <span class="absolute inset-1.5 rounded-full bg-blue-500/35 animate-ping"></span>
        <div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #ffffff;box-shadow:0 0 12px rgba(37,99,235,0.8);display:flex;align-items:center;justify-content:center;position:relative;z-index:2;">
          <div style="width:6px;height:6px;border-radius:50%;background:#ffffff;"></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// POI Pin Marker Icon (A = Green origin, B = Amber destination)
function createPoiIcon(isOrigin: boolean) {
  const bg = isOrigin ? '#10b981' : '#f59e0b';
  const label = isOrigin ? 'A' : 'B';
  return L.divIcon({
    className: 'custom-poi-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        background-color: ${bg};
        color: #ffffff;
        font-weight: 700;
        font-size: 11px;
        font-family: sans-serif;
        border-radius: 50%;
        border: 2px solid #09090b;
        box-shadow: 0 4px 10px rgba(0,0,0,0.6);
      ">
        ${label}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

export default function TransitMap(props: TransitMapProps) {
  const { resolvedTheme } = useTheme();
  const storeRoutePlan = useTransitStore((s) => s.routePlan);
  const storeOriginId = useTransitStore((s) => s.originStopId);
  const storeDestId = useTransitStore((s) => s.destinationStopId);
  const storeUserCoords = useTransitStore((s) => s.userCoords);
  const userAccuracy = useTransitStore((s) => s.userAccuracy);
  const userHeading = useTransitStore((s) => s.userHeading);
  const userSpeed = useTransitStore((s) => s.userSpeed);
  const storeAlarmTargetId = useTransitStore((s) => s.alarmTargetStopId);
  const storeAlarmThreshold = useTransitStore((s) => s.alarmThresholdMeters);
  const storeIsAlarmArmed = useTransitStore((s) => s.isAlarmArmed);
  const storeSelectedLine = useTransitStore((s) => s.selectedLineId);
  const storeSetOrigin = useTransitStore((s) => s.setOriginStop);
  const storeSetDest = useTransitStore((s) => s.setDestinationStop);
  const storeArmAlarm = useTransitStore((s) => s.armAlarm);
  const isNavigating = useTransitStore((s) => s.isNavigating);
  const navigationLegs = useTransitStore((s) => s.navigationLegs);

  const routePlan = props.routePlan !== undefined ? props.routePlan : storeRoutePlan;
  const originId = props.originId !== undefined ? props.originId : storeOriginId;
  const destinationId = props.destinationId !== undefined ? props.destinationId : storeDestId;
  const userCoords = props.userCoords !== undefined ? props.userCoords : storeUserCoords;
  const alarmTargetId = props.alarmTargetId !== undefined ? props.alarmTargetId : storeAlarmTargetId;
  const alarmThresholdMeters = props.alarmThresholdMeters !== undefined ? props.alarmThresholdMeters : storeAlarmThreshold;
  const isAlarmArmed = props.isAlarmArmed !== undefined ? props.isAlarmArmed : storeIsAlarmArmed;
  const selectedLineFilter = props.selectedLineFilter !== undefined ? props.selectedLineFilter : storeSelectedLine;
  const activeSegmentId = useTransitStore((s) => s.activeSegmentId);

  const onSelectStation = props.onSelectStation || ((id, role) => {
    if (role === 'origin') storeSetOrigin(id);
    else storeSetDest(id);
  });
  const onSetAlarm = props.onSetAlarm || ((id) => storeArmAlarm(id));

  const alarmTargetStation = alarmTargetId ? STATION_MAP[alarmTargetId] : null;

  // Filtered network polylines
  const linePolylines = useMemo(() => {
    return Object.values(TRANSIT_LINES)
      .filter((line) => selectedLineFilter === 'ALL' || line.id === selectedLineFilter)
      .map((line) => {
        const positions =
          line.trackCoords && line.trackCoords.length > 0
            ? line.trackCoords
            : line.stations
                .map((id) => STATION_MAP[id])
                .filter(Boolean)
                .map((s) => s.coords);

        return {
          id: line.id,
          name: line.name,
          color: line.color,
          positions,
        };
      });
  }, [selectedLineFilter]);

  return (
    <div className="relative w-full h-full bg-slate-50 dark:bg-zinc-950">
      <MapContainer
        center={[-6.2088, 106.8456]}
        zoom={12}
        minZoom={10}
        maxZoom={19}
        zoomControl={false}
        className="w-full h-full z-0"
        style={{ background: resolvedTheme === 'light' ? '#f4f5f7' : '#090a0f' }}
      >
        {/* CARTO Basemap (Voyager for Light / Dark Matter for Dark) */}
        {(() => {
          const apiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
          const query = apiKey ? `?api_key=${apiKey}` : '';
          return resolvedTheme === 'light' ? (
            <TileLayer
              key="carto-voyager"
              url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${query}`}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              maxZoom={19}
              subdomains="abcd"
            />
          ) : (
            <TileLayer
              key="carto-dark-matter"
              url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png${query}`}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              maxZoom={19}
              subdomains="abcd"
            />
          );
        })()}

        <MapBoundsController routePlan={routePlan} />
        <MapCenterController />
        <MapFollowController />
        <MapFloatingControls routePlan={routePlan} />
        <SegmentFocusController routePlan={routePlan} />

        {/* Network Base Polylines */}
        {linePolylines.map((line) => (
          <Polyline
            key={`network_line_${line.id}`}
            positions={line.positions}
            pathOptions={{
              color: line.color,
              weight: 4,
              opacity: routePlan ? 0.25 : 0.8,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        ))}

        {/* Active Journey Highlight */}
        {routePlan && (
          <>
            <Polyline
              positions={routePlan.polylineCoords}
              pathOptions={{
                color: '#38bdf8',
                weight: activeSegmentId ? 5 : 8,
                opacity: activeSegmentId ? 0.2 : 0.45,
                lineCap: 'round',
              }}
            />
            <Polyline
              positions={routePlan.polylineCoords}
              pathOptions={{
                color: '#ffffff',
                weight: activeSegmentId ? 2 : 4,
                opacity: activeSegmentId ? 0.35 : 0.95,
                dashArray: '6, 6',
                lineCap: 'round',
              }}
            />
          </>
        )}

        {/* Highlighted Focused Segment Overlays (Interactive Segment Focus) */}
        {routePlan && activeSegmentId && (() => {
          let coords: [number, number][] | undefined;
          let color = '#38bdf8';

          if (activeSegmentId === 'first-mile' && routePlan.firstMileWalk) {
            coords = routePlan.firstMileWalk.polylineCoords;
            color = '#f59e0b';
          } else if (activeSegmentId === 'last-mile' && routePlan.lastMileWalk) {
            coords = routePlan.lastMileWalk.polylineCoords;
            color = '#f59e0b';
          } else {
            const seg = routePlan.segments.find(
              (s, i) => s.id === activeSegmentId || `seg-${i}` === activeSegmentId
            );
            if (seg) {
              coords = seg.polylineCoords;
              color = seg.lineColor || '#0284c7';
            }
          }

          if (!coords || coords.length === 0) return null;

          return (
            <>
              {/* Outer halo / glow */}
              <Polyline
                positions={coords}
                pathOptions={{
                  color: color,
                  weight: 16,
                  opacity: 0.45,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Inner crisp casing line */}
              <Polyline
                positions={coords}
                pathOptions={{
                  color: '#ffffff',
                  weight: 8,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Vibrant center line */}
              <Polyline
                positions={coords}
                pathOptions={{
                  color: color,
                  weight: 5,
                  opacity: 1,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </>
          );
        })()}

        {/* Pedestrian First/Last-Mile Walking Polylines */}
        {routePlan?.walkingPolylineCoords &&
          routePlan.walkingPolylineCoords.map((coords, i) => (
            <Polyline
              key={`walk_polyline_${i}`}
              positions={coords}
              pathOptions={{
                color: '#fbbf24',
                weight: 5,
                opacity: 0.9,
                dashArray: '4, 8',
                lineCap: 'round',
              }}
            />
          ))}

        {/* Dynamic Turn-by-Turn Navigation Polylines */}
        {isNavigating &&
          navigationLegs &&
          navigationLegs.flatMap((leg, lIdx) => {
            if (!leg.polylineCoordinates || leg.polylineCoordinates.length < 2) return [];
            const isComp = leg.status === 'completed';
            const isAct = leg.status === 'active';
            const color =
              leg.lineColor ||
              (leg.type === 'WALK' ? '#10b981' : leg.type === 'TRANSFER' ? '#f59e0b' : '#06b6d4');

            const elements: React.ReactElement[] = [];

            if (isAct) {
              elements.push(
                <Polyline
                  key={`nav_halo_${leg.id}_${lIdx}`}
                  positions={leg.polylineCoordinates}
                  pathOptions={{
                    color,
                    weight: 14,
                    opacity: 0.35,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              );
            }

            elements.push(
              <Polyline
                key={`nav_core_${leg.id}_${lIdx}`}
                positions={leg.polylineCoordinates}
                pathOptions={{
                  color: isComp ? '#64748b' : isAct ? '#ffffff' : color,
                  weight: isComp ? 3 : isAct ? 6 : 5,
                  opacity: isComp ? 0.25 : 1.0,
                  dashArray: leg.type === 'WALK' ? '4, 8' : undefined,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            );

            if (isAct) {
              elements.push(
                <Polyline
                  key={`nav_vivid_${leg.id}_${lIdx}`}
                  positions={leg.polylineCoordinates}
                  pathOptions={{
                    color,
                    weight: 4,
                    opacity: 0.95,
                    dashArray: leg.type === 'WALK' ? '4, 8' : undefined,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              );
            }

            return elements;
          })}

        {/* Geo-Alarm Radius Perimeter */}
        {isAlarmArmed && alarmTargetStation && (
          <Circle
            center={alarmTargetStation.coords}
            radius={alarmThresholdMeters}
            pathOptions={{
              color: '#38bdf8',
              fillColor: '#38bdf8',
              fillOpacity: 0.12,
              weight: 1.5,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* Station Markers */}
        {STATIONS.map((station) => {
          const isOrigin = originId === station.id;
          const isDest = destinationId === station.id;
          const isTransfer = routePlan?.transfer
            ? routePlan.transfer.fromStation.id === station.id ||
              routePlan.transfer.toStation.id === station.id
            : false;

          return (
            <Marker
              key={`marker_${station.id}`}
              position={station.coords}
              icon={createStationIcon(station, isOrigin, isDest, isTransfer)}
              eventHandlers={{
                click: () => {
                  if (onSelectStation) {
                    if (!originId) {
                      onSelectStation(station.id, 'origin');
                    } else if (!destinationId && station.id !== originId) {
                      onSelectStation(station.id, 'dest');
                    }
                  }
                },
              }}
            >
              <Popup className="clean-transit-popup">
                <div className="p-2.5 text-slate-900 dark:text-zinc-100 min-w-[200px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase ${
                        station.lines.includes('kai-bandara')
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          : station.type === 'krl'
                          ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                          : station.type === 'mrt'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : station.type === 'lrt'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {station.lines.includes('kai-bandara') ? 'BANDARA' : station.type.toUpperCase()}
                    </span>
                    {station.code && (
                      <span className="text-[9px] font-mono text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                        {station.code}
                      </span>
                    )}
                    {station.isInterchange && (
                      <span className="text-[9px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded ml-auto">
                        Interchange
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-sm text-slate-900 dark:text-zinc-100">
                    {station.name}
                  </div>
                  {station.description && (
                    <div className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-snug">
                      {station.description}
                    </div>
                  )}

                  {onSelectStation && (
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-zinc-800 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectStation(station.id, 'origin')}
                        className="flex-1 py-1 px-2 text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded border border-slate-300 dark:border-zinc-700 transition"
                      >
                        Set Asal
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectStation(station.id, 'dest')}
                        className="flex-1 py-1 px-2 text-[11px] font-medium bg-sky-50 dark:bg-sky-950 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-200 rounded border border-sky-200 dark:border-sky-800 transition"
                      >
                        Set Tujuan
                      </button>
                    </div>
                  )}

                  {onSetAlarm && (
                    <button
                      type="button"
                      onClick={() => onSetAlarm(station.id)}
                      className="w-full mt-2 py-1 px-2 text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-200 rounded border border-rose-200 dark:border-rose-800/60 transition flex items-center justify-center gap-1"
                    >
                      <span>🔔</span> Pasang Alarm Turun
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* First-Mile POI Origin Marker */}
        {routePlan?.firstMileWalk && (
          <Marker
            position={routePlan.firstMileWalk.fromCoords}
            icon={createPoiIcon(true)}
          >
            <Popup className="clean-transit-popup">
              <div className="p-3 text-xs">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  Titik Awal (POI)
                </span>
                <div className="font-semibold text-slate-900 dark:text-zinc-100 text-sm mt-1.5">
                  {routePlan.originPlaceName || 'Lokasi Keberangkatan'}
                </div>
                <div className="text-slate-600 dark:text-zinc-400 text-[11px] mt-1 leading-snug">
                  {routePlan.firstMileWalk.instruction}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Last-Mile POI Destination Marker */}
        {routePlan?.lastMileWalk && (
          <Marker
            position={routePlan.lastMileWalk.toCoords}
            icon={createPoiIcon(false)}
          >
            <Popup className="clean-transit-popup">
              <div className="p-3 text-xs">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  Tujuan Akhir (POI)
                </span>
                <div className="font-semibold text-slate-900 dark:text-zinc-100 text-sm mt-1.5">
                  {routePlan.destinationPlaceName || 'Lokasi Tujuan'}
                </div>
                <div className="text-slate-600 dark:text-zinc-400 text-[11px] mt-1 leading-snug">
                  {routePlan.lastMileWalk.instruction}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Real User GPS Position Pin & Dynamic Accuracy Circle */}
        {userCoords && (
          <>
            {userAccuracy && userAccuracy > 0 && userAccuracy < 1500 && (
              <Circle
                center={userCoords}
                radius={userAccuracy}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#60a5fa',
                  fillOpacity: 0.12,
                  weight: 1,
                  dashArray: '3, 5',
                }}
              />
            )}
            <Marker position={userCoords} icon={createUserMarkerIcon(userHeading)}>
              <Popup className="clean-transit-popup">
                <div className="p-2 text-slate-800 dark:text-zinc-200 text-xs font-mono space-y-1">
                  <div className="font-semibold text-blue-500 flex items-center gap-1">
                    📍 <span>Posisi Anda Saat Ini</span>
                  </div>
                  <div>Akurasi: ~{Math.round(userAccuracy || 15)} meter</div>
                  {userSpeed !== null && userSpeed >= 0.5 && (
                    <div className="text-emerald-500 font-bold">
                      Kecepatan: {Math.round(userSpeed * 3.6)} km/jam
                    </div>
                  )}
                  {userHeading !== null && (
                    <div className="text-sky-500">
                      Arah: {Math.round(userHeading)}°
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}
