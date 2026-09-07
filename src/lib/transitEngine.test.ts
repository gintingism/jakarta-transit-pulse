import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  formatDistance,
  calculateFare,
  calculateTravelTime,
  findTransitRoute,
} from './transitEngine';

describe('transitEngine pure calculations', () => {
  describe('calculateHaversineDistance', () => {
    it('returns 0 for identical coordinates', () => {
      const coord: [number, number] = [-6.2088, 106.8456];
      expect(calculateHaversineDistance(coord, coord)).toBe(0);
    });

    it('calculates approximately correct spherical distance in meters', () => {
      // Stasiun Sudirman [-6.2023, 106.8236] to Halte Dukuh Atas [-6.2018, 106.8231]
      const sudirman: [number, number] = [-6.2023, 106.8236];
      const dukuhAtas: [number, number] = [-6.2018, 106.8231];
      const dist = calculateHaversineDistance(sudirman, dukuhAtas);
      expect(dist).toBeGreaterThan(50);
      expect(dist).toBeLessThan(120);
    });
  });

  describe('formatDistance', () => {
    it('formats distances under 1000m with m unit', () => {
      expect(formatDistance(350)).toBe('350 m');
      expect(formatDistance(999)).toBe('999 m');
    });

    it('formats distances 1000m and above with km unit', () => {
      expect(formatDistance(1000)).toBe('1.0 km');
      expect(formatDistance(2450)).toBe('2.5 km');
      expect(formatDistance(15200)).toBe('15.2 km');
    });
  });

  describe('calculateFare', () => {
    it('calculates TransJakarta flat rate as Rp 3.500 regardless of distance', () => {
      expect(calculateFare('tj', 2)).toBe(3500);
      expect(calculateFare('tj', 15)).toBe(3500);
      expect(calculateFare('tj', 40)).toBe(3500);
    });

    it('calculates KRL base fare as Rp 3.000 for <= 25km', () => {
      expect(calculateFare('krl', 5)).toBe(3000);
      expect(calculateFare('krl', 20)).toBe(3000);
      expect(calculateFare('krl', 25)).toBe(3000);
    });

    it('calculates KRL tiered fare with +Rp 1.000 for each additional 10km block', () => {
      // 25.1 to 35 km -> 3000 + 1000 = 4000
      expect(calculateFare('krl', 26)).toBe(4000);
      expect(calculateFare('krl', 35)).toBe(4000);
      // 35.1 to 45 km -> 3000 + 2000 = 5000
      expect(calculateFare('krl', 42)).toBe(5000);
    });

    it('calculates MRT Jakarta fare according to Pergub DKI 34/2019 (Rp 3.000 base + Rp 1.000/station, max Rp 14.000)', () => {
      // 1 station traveled (stopCount = 2): 3000 + 1000 = 4000
      expect(calculateFare('mrt', 1.5, 2)).toBe(4000);
      // 5 stations traveled (stopCount = 6): 3000 + 5000 = 8000
      expect(calculateFare('mrt', 7.0, 6)).toBe(8000);
      // Full line Lebak Bulus - Bundaran HI (13 stops): 3000 + 12000 = 15000 -> capped at 14000
      expect(calculateFare('mrt', 15.7, 13)).toBe(14000);
    });

    it('calculates LRT Jakarta flat fare as Rp 5.000', () => {
      expect(calculateFare('lrt', 3.0, 3, 'lrt-jakarta')).toBe(5000);
      expect(calculateFare('lrt', 5.8, 6, 'lrt-jakarta')).toBe(5000);
    });

    it('calculates LRT Jabodebek tiered fare according to KM 67/2023 (Rp 5.000 first 1km + Rp 700/km, max Rp 20.000)', () => {
      // <= 1 km: 5000
      expect(calculateFare('lrt', 0.8, 2, 'lrt-cibubur')).toBe(5000);
      // 3.5 km: 5000 + ceil(2.5) * 700 = 5000 + 2100 = 7100
      expect(calculateFare('lrt', 3.5, 3, 'lrt-bekasi')).toBe(7100);
      // 25 km (Dukuh Atas to Harjamukti): 5000 + 24 * 700 = 21800 -> capped at 20000
      expect(calculateFare('lrt', 25.0, 12, 'lrt-cibubur')).toBe(20000);
    });
  });

  describe('calculateTravelTime', () => {
    it('estimates positive travel time for KRL with stop dwell times', () => {
      const time = calculateTravelTime('krl', 15, 6);
      expect(time).toBeGreaterThanOrEqual(15);
    });

    it('estimates positive travel time for TransJakarta', () => {
      const time = calculateTravelTime('tj', 8, 5);
      expect(time).toBeGreaterThanOrEqual(10);
    });

    it('estimates realistic travel time for MRT (~60 km/h commercial speed + 1m dwell)', () => {
      // 15.7 km, 13 stops: (15.7/60)*60 = 15.7 + 12*1.0 = 27.7 -> ~28 mins
      const time = calculateTravelTime('mrt', 15.7, 13);
      expect(time).toBeGreaterThanOrEqual(25);
      expect(time).toBeLessThanOrEqual(35);
    });

    it('estimates realistic travel time for LRT (~45 km/h + 1m dwell)', () => {
      const time = calculateTravelTime('lrt', 5.8, 6);
      expect(time).toBeGreaterThanOrEqual(10);
      expect(time).toBeLessThanOrEqual(20);
    });
  });

  describe('findTransitRoute', () => {
    it('returns null for identical or invalid stations', () => {
      expect(findTransitRoute('krl_bekasi', 'krl_bekasi')).toBeNull();
      expect(findTransitRoute('invalid_1', 'invalid_2')).toBeNull();
    });

    it('finds direct route on KRL Cikarang line', () => {
      const route = findTransitRoute('krl_bekasi', 'krl_sudirman');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(1);
      expect(route.segments[0].lineId).toBe('krl-cikarang');
      expect(route.origin.id).toBe('krl_bekasi');
      expect(route.destination.id).toBe('krl_sudirman');
      expect(route.totalDistanceKm).toBeGreaterThan(15);
      expect(route.totalFareIdr).toBe(3000);
    });

    it('finds direct route on TransJakarta Koridor 1', () => {
      const route = findTransitRoute('tj_blokm', 'tj_monas');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(1);
      expect(route.segments[0].lineId).toBe('tj-corridor-1');
      expect(route.totalFareIdr).toBe(3500);
    });

    it('finds 1-transfer route between KRL and TransJakarta via Dukuh Atas TOD', () => {
      const route = findTransitRoute('krl_bekasi', 'tj_harmoni', 'FEWEST_TRANSFERS');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(2);
      expect(route.transfer).toBeDefined();
      expect(route.totalFareIdr).toBe(3000 + 3500); // KRL leg (3000) + TJ leg (3500)
    });

    it('finds 1-transfer intra-KRL route via Stasiun Manggarai', () => {
      const route = findTransitRoute('krl_bekasi', 'krl_bogor', 'FEWEST_TRANSFERS');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(2);
      expect(route.transfer).toBeDefined();
      expect(route.transfer?.fromStation.id).toBe('krl_manggarai');
    });

    it('finds 1-transfer route from TransJakarta to KRL via Dukuh Atas TOD', () => {
      const route = findTransitRoute('tj_blokm', 'krl_bekasi', 'FEWEST_TRANSFERS');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(2);
      expect(route.segments[0].lineId).toBe('tj-corridor-1');
      expect(route.segments[1].lineId).toBe('krl-cikarang');
      expect(route.transfer).toBeDefined();
      expect(route.totalFareIdr).toBe(3500 + 3000);
    });
  });

  describe('interchange nodes topology', () => {
    it('ensures all interchange nodes reference valid stations in STATION_MAP', async () => {
      const { INTERCHANGE_NODES, STATION_MAP } = await import('@/src/data/transitNetwork');
      expect(INTERCHANGE_NODES.length).toBeGreaterThan(0);
      for (const node of INTERCHANGE_NODES) {
        expect(STATION_MAP[node.fromStationId]).toBeDefined();
        expect(STATION_MAP[node.toStationId]).toBeDefined();
        expect(node.walkMinutes).toBeGreaterThan(0);
        expect(node.description.length).toBeGreaterThan(5);
      }
    });

    it('contains crucial multi-modal junctions (Sudirman-Dukuh Atas, Kota)', async () => {
      const { INTERCHANGE_NODES } = await import('@/src/data/transitNetwork');
      const pairs = INTERCHANGE_NODES.map((n) => `${n.fromStationId}->${n.toStationId}`);
      expect(pairs).toContain('krl_sudirman->tj_dukuh_atas');
      expect(pairs).toContain('tj_dukuh_atas->krl_sudirman');
      expect(pairs).toContain('krl_kota->tj_kotabaru');
      expect(pairs).toContain('tj_kotabaru->krl_kota');
    });
  });

  describe('physical curved tracks and roadway geometries', () => {
    it('slices physical rail tracks between stations with dense curved coordinates', async () => {
      const { getLineTrackSlice } = await import('./transitEngine');
      const { STATION_MAP } = await import('@/src/data/transitNetwork');

      const bogor = STATION_MAP['krl_bogor'];
      const manggarai = STATION_MAP['krl_manggarai'];

      // Forward direction: Bogor -> Manggarai
      const forwardSlice = getLineTrackSlice('krl-bogor', bogor.coords, manggarai.coords);
      expect(forwardSlice.length).toBeGreaterThan(100);
      expect(forwardSlice[0][0]).toBeCloseTo(bogor.coords[0], 2);
      expect(forwardSlice[forwardSlice.length - 1][0]).toBeCloseTo(manggarai.coords[0], 2);

      // Reverse direction: Manggarai -> Bogor
      const reverseSlice = getLineTrackSlice('krl-bogor', manggarai.coords, bogor.coords);
      expect(reverseSlice.length).toBeGreaterThan(100);
      expect(reverseSlice[0][0]).toBeCloseTo(manggarai.coords[0], 2);
      expect(reverseSlice[reverseSlice.length - 1][0]).toBeCloseTo(bogor.coords[0], 2);
    });

    it('generates dense curved polylineCoords on direct routes instead of straight chords', () => {
      const route = findTransitRoute('krl_bogor', 'krl_manggarai');
      expect(route).not.toBeNull();
      if (!route) return;

      // Stations count is 17, but curved polyline points must be in the hundreds (> 300)
      expect(route.allStops.length).toBe(17);
      expect(route.polylineCoords.length).toBeGreaterThan(300);
    });

    it('generates dense curved polylineCoords for TransJakarta busway corridor', () => {
      const route = findTransitRoute('tj_blokm', 'tj_monas');
      expect(route).not.toBeNull();
      if (!route) return;

      // 14 stops, curved busway lane points must be significantly greater than station count (> 150)
      expect(route.allStops.length).toBe(14);
      expect(route.polylineCoords.length).toBeGreaterThan(150);
    });

    it('ensures station and halte coordinates are accurate and close to alignment', async () => {
      const { STATION_MAP, TRANSIT_LINES } = await import('@/src/data/transitNetwork');
      // Stasiun Cilebut must be at 106.8008, not the old typo 106.7909
      expect(STATION_MAP['krl_cilebut'].coords[1]).toBeCloseTo(106.8008, 3);
      // Stasiun Matraman must be at -6.2129, 106.8589
      expect(STATION_MAP['krl_matraman'].coords[0]).toBeCloseTo(-6.2129, 3);
      // Halte Blok M must be at official platform -6.24335, 106.80201
      expect(STATION_MAP['tj_blokm'].coords[0]).toBeCloseTo(-6.24335, 3);
      // Halte Harmoni must be at official platform -6.16246, 106.81986
      expect(STATION_MAP['tj_harmoni'].coords[0]).toBeCloseTo(-6.16246, 3);
    });

    it('verifies Stasiun Karet is permanently removed and BNI City is active', async () => {
      const { STATION_MAP } = await import('@/src/data/transitNetwork');
      expect(STATION_MAP['krl_karet']).toBeUndefined();
      expect(STATION_MAP['krl_bni_city']).toBeDefined();
      expect(STATION_MAP['krl_bni_city'].lines).toContain('krl-cikarang');
    });

    it('finds direct route on KRL Lin Rangkasbitung (Tanah Abang to Serpong & Rangkasbitung)', () => {
      const routeSerpong = findTransitRoute('krl_tanahabang', 'krl_serpong');
      expect(routeSerpong).not.toBeNull();
      if (!routeSerpong) return;

      expect(routeSerpong.segments.length).toBe(1);
      expect(routeSerpong.segments[0].lineId).toBe('krl-rangkasbitung');
      expect(routeSerpong.allStops.length).toBe(8);
      expect(routeSerpong.polylineCoords.length).toBeGreaterThan(300);

      // Full terminus route to Rangkasbitung
      const routeRangkas = findTransitRoute('krl_tanahabang', 'krl_rangkasbitung');
      expect(routeRangkas).not.toBeNull();
      if (!routeRangkas) return;
      expect(routeRangkas.allStops.length).toBe(19);
      expect(routeRangkas.totalDistanceKm).toBeGreaterThan(60);
      expect(routeRangkas.polylineCoords.length).toBeGreaterThan(1000);
    });

    it('finds direct route on KRL Lin Tangerang (Duri to Tangerang)', () => {
      const route = findTransitRoute('krl_duri', 'krl_tangerang', 'FEWEST_TRANSFERS');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(1);
      expect(route.segments[0].lineId).toBe('krl-tangerang');
      expect(route.allStops.length).toBe(11);
      expect(route.polylineCoords.length).toBeGreaterThan(100);
    });

    it('finds direct route on KRL Lin Cikarang via Pasar Senen', () => {
      const route = findTransitRoute('krl_bekasi', 'krl_pasarsenen');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(1);
      expect(route.segments[0].lineId).toBe('krl-cikarang-senen');
      expect(route.allStops.map((s) => s.id)).toContain('krl_pasarsenen');
      expect(route.polylineCoords.length).toBeGreaterThan(150);
    });

    it('finds 1-transfer route between Lin Rangkasbitung and Lin Cikarang via Tanah Abang', () => {
      const route = findTransitRoute('krl_serpong', 'krl_sudirman', 'FEWEST_TRANSFERS');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(2);
      expect(route.segments[0].lineId).toBe('krl-rangkasbitung');
      expect(route.segments[1].lineId).toBe('krl-cikarang');
      expect(route.transfer?.fromStation.id).toBe('krl_tanahabang');
    });

    it('finds 1-transfer route between Lin Tangerang and Lin Cikarang via Duri', () => {
      const route = findTransitRoute('krl_tangerang', 'krl_bekasi', 'FEWEST_TRANSFERS');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(2);
      expect(route.segments[0].lineId).toBe('krl-tangerang');
      expect(route.segments[1].lineId).toBe('krl-cikarang');
      expect(route.transfer?.fromStation.id).toBe('krl_duri');
    });

    it('finds multi-transfer route between Lin Rangkasbitung and Lin Bogor via Tanah Abang and Manggarai', () => {
      const route = findTransitRoute('krl_serpong', 'krl_bogor');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(3);
      expect(route.segments[0].lineId).toBe('krl-rangkasbitung');
      expect(route.segments[1].lineId).toBe('krl-cikarang');
      expect(route.segments[2].lineId).toBe('krl-bogor');
      expect(route.transfers?.length).toBe(2);
      expect(route.transfers?.[0].fromStation.id).toBe('krl_tanahabang');
      expect(route.transfers?.[1].fromStation.id).toBe('krl_manggarai');
    });

    it('finds direct route on MRT Jakarta Lin Utara-Selatan (Lebak Bulus to Bundaran HI)', () => {
      const route = findTransitRoute('mrt_lebakbulus', 'mrt_bundaran_hi');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(1);
      expect(route.segments[0].lineId).toBe('mrt-ns');
      expect(route.allStops.length).toBe(13);
      expect(route.totalDistanceKm).toBeGreaterThan(14);
      expect(route.totalFareIdr).toBe(14000); // Max fare cap
      expect(route.polylineCoords.length).toBeGreaterThan(150); // Curved physical rail
    });

    it('finds direct route on LRT Jakarta Lin 1 (Pegangsaan Dua to Velodrome)', () => {
      const route = findTransitRoute('lrtj_pegangsaandua', 'lrtj_velodrome');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(1);
      expect(route.segments[0].lineId).toBe('lrt-jakarta');
      expect(route.allStops.length).toBe(6);
      expect(route.totalFareIdr).toBe(5000); // Flat fare
      expect(route.polylineCoords.length).toBeGreaterThan(60); // Curved elevated track
    });

    it('finds direct route on LRT Jabodebek Lin Cibubur (Dukuh Atas to Harjamukti)', () => {
      const route = findTransitRoute('lrt_dukuh_atas', 'lrt_harjamukti');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(1);
      expect(route.segments[0].lineId).toBe('lrt-cibubur');
      expect(route.allStops.length).toBe(12);
      expect(route.totalDistanceKm).toBeGreaterThan(20);
      expect(route.totalFareIdr).toBe(20000); // Official KM 67/2023 cap
      expect(route.polylineCoords.length).toBeGreaterThan(300);
    });

    it('finds direct route on LRT Jabodebek Lin Bekasi (Dukuh Atas to Jatimulya via Halim Whoosh)', () => {
      const route = findTransitRoute('lrt_dukuh_atas', 'lrt_jatimulya');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(1);
      expect(route.segments[0].lineId).toBe('lrt-bekasi');
      expect(route.allStops.length).toBe(14);
      expect(route.allStops.map((s) => s.id)).toContain('lrt_halim');
      expect(route.totalDistanceKm).toBeGreaterThan(25);
      expect(route.totalFareIdr).toBe(20000); // Official KM 67/2023 cap
      expect(route.polylineCoords.length).toBeGreaterThan(300);
    });

    it('finds multi-modal 1-transfer route between MRT and TransJakarta (Fatmawati to Halte Monas)', () => {
      const route = findTransitRoute('mrt_fatmawati', 'tj_monas');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(2);
      expect(route.segments[0].lineId).toBe('mrt-ns');
      expect(route.segments[1].lineId).toBe('tj-corridor-1');
      expect(route.transfer).toBeDefined();
      // Total fare should be MRT leg fare + TJ flat fare Rp 3.500
      expect(route.totalFareIdr).toBe(route.segments[0].fareIdr + 3500);
    });

    it('finds multi-modal 1-transfer route between LRT Jabodebek and KRL via Cikoko / Cawang skybridge', () => {
      const route = findTransitRoute('lrt_harjamukti', 'krl_bogor');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(2);
      expect(route.segments[0].lineId).toBe('lrt-cibubur');
      expect(route.segments[1].lineId).toBe('krl-bogor');
      expect(route.transfer?.fromStation.id).toBe('lrt_cikoko');
      expect(route.transfer?.toStation.id).toBe('krl_cawang');
      expect(route.totalFareIdr).toBe(route.segments[0].fareIdr + route.segments[1].fareIdr);
    });

    it('finds multi-modal 1-transfer route between LRT Jabodebek and MRT via TOD Dukuh Atas', () => {
      const route = findTransitRoute('lrt_harjamukti', 'mrt_blokm');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(2);
      expect(route.segments[0].lineId).toBe('lrt-cibubur');
      expect(route.segments[1].lineId).toBe('mrt-ns');
      expect(route.transfer?.fromStation.id).toBe('lrt_dukuh_atas');
      expect(route.transfer?.toStation.id).toBe('mrt_dukuh_atas');
      expect(route.totalFareIdr).toBe(route.segments[0].fareIdr + route.segments[1].fareIdr);
    });

    it('finds direct route on KAI Bandara from Stasiun Manggarai / BNI City to Bandara Soekarno-Hatta', () => {
      const route = findTransitRoute('krl_manggarai', 'ka_bandara_shia');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(1);
      expect(route.segments[0].lineId).toBe('kai-bandara');
      expect(route.destination.id).toBe('ka_bandara_shia');
      expect(route.allStops.length).toBe(5);
      expect(route.totalFareIdr).toBe(70000);
      expect(route.polylineCoords.length).toBeGreaterThan(100);
    });

    it('finds 1-transfer route from KRL Lin Bogor to Bandara Soekarno-Hatta via Manggarai', () => {
      const route = findTransitRoute('krl_bogor', 'ka_bandara_shia', 'FEWEST_TRANSFERS');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(2);
      expect(route.segments[0].lineId).toBe('krl-bogor');
      expect(route.segments[1].lineId).toBe('kai-bandara');
      expect(route.destination.id).toBe('ka_bandara_shia');
      expect(route.totalFareIdr).toBe(route.segments[0].fareIdr + 70000);
    });

    it('finds 1-transfer route from KRL Tangerang to Bandara Soekarno-Hatta via Batu Ceper', () => {
      const route = findTransitRoute('krl_tangerang', 'ka_bandara_shia', 'FEWEST_TRANSFERS');
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.segments.length).toBe(2);
      expect(route.segments[0].lineId).toBe('krl-tangerang');
      expect(route.segments[1].lineId).toBe('kai-bandara');
      expect(route.transfer?.fromStation.id).toBe('krl_batuceper');
      expect(route.destination.id).toBe('ka_bandara_shia');
    });

    it('finds door-to-door route from user location to Bandara Soekarno-Hatta', async () => {
      const { findDoorToDoorRoute } = await import('./transitEngine');
      const origin = { name: 'Lokasi Saya', coords: [-6.1754, 106.8272] as [number, number] }; // near Juanda/Monas
      const destination = {
        name: 'Bandara Soekarno-Hatta (SHIA)',
        coords: [-6.12748, 106.65179] as [number, number],
        stationId: 'ka_bandara_shia',
      };

      const plan = await findDoorToDoorRoute(origin, destination, 'FASTEST');
      expect(plan).not.toBeNull();
      if (!plan) return;

      const lineIds = plan.segments.map((s) => s.lineId);
      expect(lineIds).toContain('kai-bandara');
      expect(plan.destination.id).toBe('ka_bandara_shia');
    });
  });
});

