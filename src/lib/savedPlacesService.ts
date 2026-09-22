/**
 * Pure functions & domain models for saved places & commuter route shortcuts.
 * 100% decoupled from React and Leaflet DOM per AGENTS.md rules.
 * Handles localStorage persistence, validation, and migration.
 */

import { PlaceTarget } from '@/src/lib/transitEngine';

export type SavedPlaceType = 'home' | 'work' | 'custom';

export interface SavedPlace {
  id: string; // 'home' | 'work' | custom uuid
  type: SavedPlaceType;
  label: string; // 'Rumah' | 'Kantor' | custom name
  target: PlaceTarget;
  updatedAt: number;
}

export interface SavedRoute {
  id: string;
  name: string; // e.g. "Rumah ke Kantor"
  origin: PlaceTarget;
  destination: PlaceTarget;
  preference?: 'FASTEST' | 'CHEAPEST' | 'FEWEST_TRANSFERS';
  createdAt: number;
}

export const STORAGE_KEYS = {
  SAVED_PLACES: 'jtp_saved_places_v1',
  SAVED_ROUTES: 'jtp_saved_routes_v1',
} as const;

/**
 * Validates whether an unknown object is a valid PlaceTarget.
 */
export function isValidPlaceTarget(obj: unknown): obj is PlaceTarget {
  if (!obj || typeof obj !== 'object') return false;
  const target = obj as Partial<PlaceTarget>;
  if (typeof target.name !== 'string' || target.name.trim().length === 0) return false;
  if (!Array.isArray(target.coords) || target.coords.length !== 2) return false;
  const [lat, lng] = target.coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return true;
}

/**
 * Validates whether an unknown object is a valid SavedPlace.
 */
export function isValidSavedPlace(obj: unknown): obj is SavedPlace {
  if (!obj || typeof obj !== 'object') return false;
  const place = obj as Partial<SavedPlace>;
  if (typeof place.id !== 'string' || place.id.trim().length === 0) return false;
  if (place.type !== 'home' && place.type !== 'work' && place.type !== 'custom') return false;
  if (typeof place.label !== 'string' || place.label.trim().length === 0) return false;
  if (!isValidPlaceTarget(place.target)) return false;
  if (typeof place.updatedAt !== 'number') return false;
  return true;
}

/**
 * Validates whether an unknown object is a valid SavedRoute.
 */
export function isValidSavedRoute(obj: unknown): obj is SavedRoute {
  if (!obj || typeof obj !== 'object') return false;
  const route = obj as Partial<SavedRoute>;
  if (typeof route.id !== 'string' || route.id.trim().length === 0) return false;
  if (typeof route.name !== 'string' || route.name.trim().length === 0) return false;
  if (!isValidPlaceTarget(route.origin)) return false;
  if (!isValidPlaceTarget(route.destination)) return false;
  if (typeof route.createdAt !== 'number') return false;
  return true;
}

/**
 * Loads saved places from localStorage with strict runtime validation and fallback.
 */
export function loadSavedPlacesFromStorage(): SavedPlace[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_PLACES);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidSavedPlace);
  } catch {
    return [];
  }
}

/**
 * Saves places list to localStorage.
 */
export function savePlacesToStorage(places: SavedPlace[]): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  try {
    const validPlaces = places.filter(isValidSavedPlace);
    localStorage.setItem(STORAGE_KEYS.SAVED_PLACES, JSON.stringify(validPlaces));
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads saved routes from localStorage with validation.
 */
export function loadSavedRoutesFromStorage(): SavedRoute[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_ROUTES);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidSavedRoute);
  } catch {
    return [];
  }
}

/**
 * Saves routes list to localStorage.
 */
export function saveRoutesToStorage(routes: SavedRoute[]): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  try {
    const validRoutes = routes.filter(isValidSavedRoute);
    localStorage.setItem(STORAGE_KEYS.SAVED_ROUTES, JSON.stringify(validRoutes));
    return true;
  } catch {
    return false;
  }
}

/**
 * Upserts a place into an existing list of saved places.
 */
export function upsertSavedPlace(
  places: SavedPlace[],
  placeToSave: SavedPlace
): SavedPlace[] {
  const existingIdx = places.findIndex((p) => p.id === placeToSave.id);
  if (existingIdx >= 0) {
    const updated = [...places];
    updated[existingIdx] = placeToSave;
    return updated;
  }
  return [...places, placeToSave];
}

/**
 * Removes a place from list by ID.
 */
export function removeSavedPlaceById(
  places: SavedPlace[],
  placeId: string
): SavedPlace[] {
  return places.filter((p) => p.id !== placeId);
}

/**
 * Adds a new route to saved routes (max 10 routes, newest first).
 */
export function addSavedRoute(
  routes: SavedRoute[],
  newRoute: SavedRoute
): SavedRoute[] {
  const filtered = routes.filter((r) => r.id !== newRoute.id);
  return [newRoute, ...filtered].slice(0, 10);
}

/**
 * Removes a saved route by ID.
 */
export function removeSavedRouteById(
  routes: SavedRoute[],
  routeId: string
): SavedRoute[] {
  return routes.filter((r) => r.id !== routeId);
}

/**
 * Checks if a route between origin and destination is already saved.
 */
export function findMatchingSavedRoute(
  routes: SavedRoute[],
  origin: PlaceTarget | null,
  destination: PlaceTarget | null
): SavedRoute | undefined {
  if (!origin || !destination) return undefined;
  return routes.find((r) => {
    const originMatch =
      (Boolean(r.origin.stationId) && r.origin.stationId === origin.stationId) ||
      r.origin.name.trim().toLowerCase() === origin.name.trim().toLowerCase();
    const destMatch =
      (Boolean(r.destination.stationId) && r.destination.stationId === destination.stationId) ||
      r.destination.name.trim().toLowerCase() === destination.name.trim().toLowerCase();
    return originMatch && destMatch;
  });
}
