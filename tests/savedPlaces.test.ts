import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SavedPlace,
  SavedRoute,
  STORAGE_KEYS,
  isValidPlaceTarget,
  isValidSavedPlace,
  isValidSavedRoute,
  loadSavedPlacesFromStorage,
  savePlacesToStorage,
  loadSavedRoutesFromStorage,
  saveRoutesToStorage,
  upsertSavedPlace,
  removeSavedPlaceById,
  addSavedRoute,
  removeSavedRouteById,
  findMatchingSavedRoute,
} from '@/src/lib/savedPlacesService';
import { PlaceTarget } from '@/src/lib/transitEngine';

describe('Saved Places & Commuter Shortcuts Service', () => {
  const sampleTargetHome: PlaceTarget = {
    name: 'Stasiun Tebet',
    coords: [-6.2265, 106.8584],
    stationId: 'krl_tebet',
  };

  const sampleTargetWork: PlaceTarget = {
    name: 'Stasiun Sudirman',
    coords: [-6.2023, 106.8236],
    stationId: 'krl_sudirman',
  };

  const sampleSavedPlace: SavedPlace = {
    id: 'home',
    type: 'home',
    label: 'Rumah',
    target: sampleTargetHome,
    updatedAt: 1700000000000,
  };

  const sampleSavedRoute: SavedRoute = {
    id: 'route_1',
    name: 'Tebet ke Sudirman',
    origin: sampleTargetHome,
    destination: sampleTargetWork,
    preference: 'FASTEST',
    createdAt: 1700000000000,
  };

  describe('Validation Functions', () => {
    it('isValidPlaceTarget should validate correct target and reject malformed targets', () => {
      expect(isValidPlaceTarget(sampleTargetHome)).toBe(true);
      expect(isValidPlaceTarget({ name: 'Monas', coords: [-6.1754, 106.8272] })).toBe(true);

      // Invalid targets
      expect(isValidPlaceTarget(null)).toBe(false);
      expect(isValidPlaceTarget(undefined)).toBe(false);
      expect(isValidPlaceTarget({})).toBe(false);
      expect(isValidPlaceTarget({ name: '', coords: [-6.1, 106.8] })).toBe(false);
      expect(isValidPlaceTarget({ name: 'Test', coords: [-6.1] })).toBe(false);
      expect(isValidPlaceTarget({ name: 'Test', coords: [-6.1, NaN] })).toBe(false);
      expect(isValidPlaceTarget({ name: 'Test', coords: 'invalid' })).toBe(false);
    });

    it('isValidSavedPlace should validate correct saved place and reject malformed entries', () => {
      expect(isValidSavedPlace(sampleSavedPlace)).toBe(true);

      // Invalid places
      expect(isValidSavedPlace(null)).toBe(false);
      expect(isValidSavedPlace({ ...sampleSavedPlace, id: '' })).toBe(false);
      expect(isValidSavedPlace({ ...sampleSavedPlace, type: 'invalid_type' })).toBe(false);
      expect(isValidSavedPlace({ ...sampleSavedPlace, label: '' })).toBe(false);
      expect(isValidSavedPlace({ ...sampleSavedPlace, target: { name: '' } })).toBe(false);
      expect(isValidSavedPlace({ ...sampleSavedPlace, updatedAt: 'not_a_number' })).toBe(false);
    });

    it('isValidSavedRoute should validate correct route and reject malformed entries', () => {
      expect(isValidSavedRoute(sampleSavedRoute)).toBe(true);

      // Invalid routes
      expect(isValidSavedRoute(null)).toBe(false);
      expect(isValidSavedRoute({ ...sampleSavedRoute, id: '' })).toBe(false);
      expect(isValidSavedRoute({ ...sampleSavedRoute, name: '' })).toBe(false);
      expect(isValidSavedRoute({ ...sampleSavedRoute, origin: { name: '' } })).toBe(false);
      expect(isValidSavedRoute({ ...sampleSavedRoute, destination: null })).toBe(false);
      expect(isValidSavedRoute({ ...sampleSavedRoute, createdAt: 'not_a_number' })).toBe(false);
    });
  });

  describe('Pure List Operations', () => {
    it('upsertSavedPlace should add new place or update existing place by ID', () => {
      const initial: SavedPlace[] = [sampleSavedPlace];

      const workPlace: SavedPlace = {
        id: 'work',
        type: 'work',
        label: 'Kantor',
        target: sampleTargetWork,
        updatedAt: 1700000010000,
      };

      // Add new
      const withWork = upsertSavedPlace(initial, workPlace);
      expect(withWork).toHaveLength(2);
      expect(withWork.find((p) => p.id === 'work')?.label).toBe('Kantor');

      // Update existing
      const updatedHome: SavedPlace = {
        ...sampleSavedPlace,
        target: { name: 'Stasiun Cawang', coords: [-6.242, 106.858], stationId: 'krl_cawang' },
        updatedAt: 1700000020000,
      };
      const afterUpdate = upsertSavedPlace(withWork, updatedHome);
      expect(afterUpdate).toHaveLength(2);
      expect(afterUpdate.find((p) => p.id === 'home')?.target.name).toBe('Stasiun Cawang');
    });

    it('removeSavedPlaceById should remove place matching ID', () => {
      const initial: SavedPlace[] = [sampleSavedPlace];
      const result = removeSavedPlaceById(initial, 'home');
      expect(result).toHaveLength(0);

      // Non-existent ID should keep list intact
      const intact = removeSavedPlaceById(initial, 'non_existent');
      expect(intact).toHaveLength(1);
    });

    it('addSavedRoute should prepend new route and cap at 10 routes', () => {
      let routes: SavedRoute[] = [];
      for (let i = 0; i < 12; i++) {
        const route: SavedRoute = {
          id: `route_${i}`,
          name: `Rute ${i}`,
          origin: sampleTargetHome,
          destination: sampleTargetWork,
          createdAt: 1700000000000 + i,
        };
        routes = addSavedRoute(routes, route);
      }

      // Max 10 routes
      expect(routes).toHaveLength(10);
      // Newest should be at index 0
      expect(routes[0].id).toBe('route_11');
      expect(routes[9].id).toBe('route_2');
    });

    it('removeSavedRouteById should remove route by ID', () => {
      const initial: SavedRoute[] = [sampleSavedRoute];
      const result = removeSavedRouteById(initial, 'route_1');
      expect(result).toHaveLength(0);
    });

    it('findMatchingSavedRoute should correctly identify existing matching routes', () => {
      const routes: SavedRoute[] = [sampleSavedRoute];

      // Exact match by stationId
      const match1 = findMatchingSavedRoute(routes, sampleTargetHome, sampleTargetWork);
      expect(match1).toBeDefined();
      expect(match1?.id).toBe('route_1');

      // Match by place name (case-insensitive)
      const matchByName = findMatchingSavedRoute(
        routes,
        { name: 'stasiun tebet', coords: [-6.2265, 106.8584] },
        { name: 'STASIUN SUDIRMAN', coords: [-6.2023, 106.8236] }
      );
      expect(matchByName).toBeDefined();

      // Non-matching origin
      const noMatch = findMatchingSavedRoute(
        routes,
        { name: 'Stasiun Bogor', coords: [-6.595, 106.79] },
        sampleTargetWork
      );
      expect(noMatch).toBeUndefined();

      // Null targets
      expect(findMatchingSavedRoute(routes, null, sampleTargetWork)).toBeUndefined();
    });
  });

  describe('Storage Persistence & Error Resilience', () => {
    const mockStorage: Record<string, string> = {};
    const fakeLocalStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        for (const key of Object.keys(mockStorage)) {
          delete mockStorage[key];
        }
      },
    };

    beforeEach(() => {
      fakeLocalStorage.clear();
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', fakeLocalStorage);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('loadSavedPlacesFromStorage should return empty array when storage is empty or invalid JSON', () => {
      expect(loadSavedPlacesFromStorage()).toEqual([]);

      localStorage.setItem(STORAGE_KEYS.SAVED_PLACES, 'invalid-json{{{');
      expect(loadSavedPlacesFromStorage()).toEqual([]);

      localStorage.setItem(STORAGE_KEYS.SAVED_PLACES, JSON.stringify([{ bad: 'data' }]));
      expect(loadSavedPlacesFromStorage()).toEqual([]);
    });

    it('savePlacesToStorage and loadSavedPlacesFromStorage should correctly persist valid places', () => {
      const places = [sampleSavedPlace];
      const saved = savePlacesToStorage(places);
      expect(saved).toBe(true);

      const loaded = loadSavedPlacesFromStorage();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('home');
      expect(loaded[0].target.name).toBe('Stasiun Tebet');
    });

    it('loadSavedRoutesFromStorage and saveRoutesToStorage should persist valid routes', () => {
      const routes = [sampleSavedRoute];
      const saved = saveRoutesToStorage(routes);
      expect(saved).toBe(true);

      const loaded = loadSavedRoutesFromStorage();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Tebet ke Sudirman');
    });
  });
});
