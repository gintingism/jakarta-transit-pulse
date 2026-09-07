import { describe, it, expect } from 'vitest';
import {
  findDoorToDoorRoute,
  calculateFare,
  WalkLeg,
  PlaceTarget,
} from './transitEngine';
import { searchPOIs, JAKARTA_OFFLINE_LANDMARKS } from './poiService';
import { calculateWalkingRoute, generateHeuristicWalkingRoute } from './walkingEngine';

describe('Door-to-Door & POI Multi-Modal Journey Engine', () => {
  describe('poiService', () => {
    it('finds curated offline landmarks by query', async () => {
      const results = await searchPOIs('Menara BCA');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('BCA');
      expect(results[0].coords[0]).toBeCloseTo(-6.1957, 2);
      expect(results[0].coords[1]).toBeCloseTo(106.8214, 2);
    });

    it('finds transit stations by query in POI search', async () => {
      const results = await searchPOIs('Sudirman');
      expect(results.length).toBeGreaterThan(0);
      const sudirman = results.find((r) => r.id.includes('krl_sudirman'));
      expect(sudirman).toBeDefined();
      expect(sudirman?.category).toBe('station');
    });

    it('handles short or empty queries gracefully', async () => {
      expect(await searchPOIs('')).toEqual([]);
      expect(await searchPOIs('a')).toEqual([]);
    });
  });

  describe('walkingEngine', () => {
    it('generates heuristic walking route with correct metrics', () => {
      const coord1: [number, number] = [-6.1957, 106.8214]; // Menara BCA
      const coord2: [number, number] = [-6.2018, 106.8231]; // Halte Dukuh Atas
      const route = generateHeuristicWalkingRoute(coord1, coord2, 'Menara BCA', 'Halte Dukuh Atas');

      expect(route.distanceMeters).toBeGreaterThan(500);
      expect(route.distanceMeters).toBeLessThan(1200);
      expect(route.durationMinutes).toBeGreaterThan(5);
      expect(route.steps.length).toBeGreaterThanOrEqual(2);
      expect(route.polylineCoords.length).toBe(2);
    });

    it('calculates walking route with zero distance if already at destination', async () => {
      const coord: [number, number] = [-6.1957, 106.8214];
      const route = await calculateWalkingRoute(coord, coord);
      expect(route.distanceMeters).toBeLessThan(20);
      expect(route.durationMinutes).toBe(1);
    });
  });

  describe('findDoorToDoorRoute', () => {
    it('plans door-to-door trip from Menara BCA (POI) to Halte Harmoni (Station)', async () => {
      const origin: PlaceTarget = {
        name: 'Menara BCA',
        coords: [-6.1957, 106.8214],
      };
      const destination: PlaceTarget = {
        name: 'Halte Harmoni',
        coords: [-6.1652, 106.8188],
        stationId: 'tj_harmoni',
      };

      const plan = await findDoorToDoorRoute(origin, destination);
      expect(plan).not.toBeNull();
      if (!plan) return;

      // First mile walk to nearest station (e.g. Bundaran HI or Tosari)
      expect(plan.firstMileWalk).toBeDefined();
      expect(plan.firstMileWalk?.toName).toBeDefined();
      expect(plan.firstMileWalk?.distanceMeters).toBeGreaterThan(0);

      // Transit ride
      expect(plan.segments.length).toBeGreaterThanOrEqual(1);

      // Accurate Jakarta transit fare: walk (Rp 0) + TJ fare (Rp 3.500) = Rp 3.500
      expect(plan.totalFareIdr).toBe(3500);
    });

    it('plans door-to-door trip between two POIs: Grand Indonesia to Monas', async () => {
      const origin: PlaceTarget = {
        name: 'Grand Indonesia',
        coords: [-6.1958, 106.8209],
      };
      const destination: PlaceTarget = {
        name: 'Monumen Nasional',
        coords: [-6.1754, 106.8272],
      };

      const plan = await findDoorToDoorRoute(origin, destination);
      expect(plan).not.toBeNull();
      if (!plan) return;

      expect(plan.firstMileWalk).toBeDefined();
      expect(plan.lastMileWalk).toBeDefined();
      expect(plan.originPlaceName).toBe('Grand Indonesia');
      expect(plan.destinationPlaceName).toBe('Monumen Nasional');
      expect(plan.totalDurationMinutes).toBeGreaterThan(10);
      expect(plan.totalFareIdr).toBe(3500); // TJ transit flat fare
    });

    it('calculates long walk warning when distance to station exceeds 1.5 km', async () => {
      // Remote point in Cilandak far from active KRL/TJ line
      const origin: PlaceTarget = {
        name: 'Cilandak Town Square',
        coords: [-6.2917, 106.7997],
      };
      const destination: PlaceTarget = {
        name: 'Halte Harmoni',
        coords: [-6.1652, 106.8188],
        stationId: 'tj_harmoni',
      };

      const plan = await findDoorToDoorRoute(origin, destination);
      expect(plan).not.toBeNull();
      if (!plan) return;

      expect(plan.firstMileWalk).toBeDefined();
      expect(plan.firstMileWalk?.isWarningLongWalk).toBe(true);
    });
  });
});
