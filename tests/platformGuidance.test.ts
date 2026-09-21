import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPlatformGuidance,
  PLATFORM_GUIDANCE_RULES,
} from '@/src/data/platformGuidanceData';
import { convertRoutePlanToLegs } from '@/src/types/navigation';
import { RoutePlan } from '@/src/lib/transitEngine';
import { Station, LineIdentifier } from '@/src/data/transitNetwork';
import { useTransitStore } from '@/stores/useTransitStore';

function createMockStation(
  id: string,
  name: string,
  coords: [number, number],
  lines: LineIdentifier[]
): Station {
  return {
    id,
    name,
    type: 'krl',
    lines,
    coords,
    coordinates: coords,
    isInterchange: lines.length > 1,
  };
}

describe('Platform & Transfer Guidance Domain Engine', () => {
  describe('getPlatformGuidance pure lookup', () => {
    it('returns accurate platform for Manggarai SO-7 Cikarang line westbound (Tanah Abang/Angke)', () => {
      const guidance = getPlatformGuidance(
        'krl_manggarai',
        'krl-cikarang',
        'krl_tanah_abang'
      );
      expect(guidance).not.toBeNull();
      expect(guidance?.platform).toBe('Jalur 1 & 2');
      expect(guidance?.level).toContain('Lantai Dasar');
      expect(guidance?.direction).toContain('Tanah Abang');
      expect(guidance?.facilities).toContain('Eskalator');
    });

    it('returns accurate platform for Manggarai SO-7 Cikarang line eastbound (Bekasi/Cikarang)', () => {
      const guidance = getPlatformGuidance(
        'krl_manggarai',
        'krl-cikarang',
        'krl_bekasi'
      );
      expect(guidance).not.toBeNull();
      expect(guidance?.platform).toBe('Jalur 3 & 4');
      expect(guidance?.level).toContain('Lantai Dasar');
      expect(guidance?.direction).toContain('Bekasi / Cikarang');
    });

    it('returns accurate elevated platform for Manggarai SO-7 Bogor line northbound (Kota)', () => {
      const guidance = getPlatformGuidance(
        'krl_manggarai',
        'krl-bogor',
        'krl_jakarta_kota'
      );
      expect(guidance).not.toBeNull();
      expect(guidance?.platform).toBe('Jalur 9 & 10');
      expect(guidance?.level).toContain('Lantai Layang');
      expect(guidance?.direction).toContain('Jakarta Kota');
    });

    it('returns accurate elevated platform for Manggarai SO-7 Bogor line southbound (Bogor/Depok)', () => {
      const guidance = getPlatformGuidance(
        'krl_manggarai',
        'krl-bogor',
        'krl_bogor'
      );
      expect(guidance).not.toBeNull();
      expect(guidance?.platform).toBe('Jalur 11 & 12');
      expect(guidance?.level).toContain('Lantai Layang');
      expect(guidance?.direction).toContain('Depok / Bogor / Nambo');
    });

    it('returns accurate platform for Tanah Abang Rangkasbitung & Cikarang lines', () => {
      const rangkas = getPlatformGuidance('krl_tanah_abang', 'krl-rangkasbitung');
      expect(rangkas?.platform).toBe('Peron 5 & 6');
      expect(rangkas?.direction).toContain('Rangkasbitung');

      const cikarangNorth = getPlatformGuidance(
        'krl_tanah_abang',
        'krl-cikarang',
        'krl_duri'
      );
      expect(cikarangNorth?.platform).toBe('Peron 1');

      const cikarangEast = getPlatformGuidance(
        'krl_tanah_abang',
        'krl-cikarang',
        'krl_manggarai'
      );
      expect(cikarangEast?.platform).toBe('Peron 2');
    });

    it('returns accurate platform for Duri Tangerang line', () => {
      const tangerang = getPlatformGuidance('krl_duri', 'krl-tangerang');
      expect(tangerang?.platform).toBe('Peron 5');
      expect(tangerang?.level).toContain('Lantai Atas');
      expect(tangerang?.direction).toContain('Tangerang');
    });

    it('returns accurate platform for CSW integrated hub (Koridor 1 vs Koridor 13)', () => {
      const csw1 = getPlatformGuidance('tj_csw', 'tj-corridor-1');
      expect(csw1?.platform).toBe('Lantai 1');
      expect(csw1?.level).toContain('Lantai Bawah');

      const csw13 = getPlatformGuidance('tj_csw_2', 'tj-corridor-13');
      expect(csw13?.platform).toBe('Lantai 4 & 5');
      expect(csw13?.level).toContain('Lantai Atas');
    });

    it('returns fallback guidance when line or target station is omitted', () => {
      const fallback = getPlatformGuidance('krl_sudirman');
      expect(fallback).not.toBeNull();
      expect(fallback?.stationName).toBe('Stasiun Sudirman');
      expect(fallback?.transferTips).toContain('Jembatan Penyeberangan Multiguna');
    });

    it('returns null for unknown stations', () => {
      expect(getPlatformGuidance('unknown_station_xyz')).toBeNull();
      expect(getPlatformGuidance('')).toBeNull();
    });

    it('handles uppercase station IDs case-insensitively', () => {
      const guidance = getPlatformGuidance('KRL_MANGGARAI');
      expect(guidance).not.toBeNull();
    });
  });

  describe('convertRoutePlanToLegs with platform guidance', () => {
    it('attaches platform guidance to transit legs when station has known guidance', () => {
      const tebet = createMockStation('krl_tebet', 'Stasiun Tebet', [-6.2263, 106.8582], ['krl-bogor']);
      const manggarai = createMockStation('krl_manggarai', 'Stasiun Manggarai', [-6.2099, 106.8501], ['krl-bogor', 'krl-cikarang']);
      const tanahAbang = createMockStation('krl_tanah_abang', 'Stasiun Tanah Abang', [-6.1856, 106.8109], ['krl-cikarang']);

      const mockRoutePlan: RoutePlan = {
        origin: tebet,
        destination: tanahAbang,
        allStops: [tebet, manggarai, tanahAbang],
        totalDistanceKm: 7.5,
        totalDurationMinutes: 25,
        totalFareIdr: 3000,
        polylineCoords: [[-6.2263, 106.8582], [-6.2099, 106.8501], [-6.1856, 106.8109]],
        transfers: [
          {
            fromStation: manggarai,
            toStation: manggarai,
            walkMinutes: 4,
            instruction: 'Transit ke Lin Cikarang di Peron 1 & 2',
          },
        ],
        segments: [
          {
            id: 'seg-1',
            lineId: 'krl-bogor',
            lineName: 'Lin Bogor',
            lineColor: '#e11d48',
            type: 'krl',
            fromStation: tebet,
            toStation: manggarai,
            stops: [tebet, manggarai],
            stopCount: 2,
            distanceKm: 2.5,
            durationMinutes: 7,
            fareIdr: 3000,
            instruction: 'Naik KRL Lin Bogor menuju Stasiun Manggarai',
          },
          {
            id: 'seg-2',
            lineId: 'krl-cikarang',
            lineName: 'Lin Cikarang',
            lineColor: '#0284c7',
            type: 'krl',
            fromStation: manggarai,
            toStation: tanahAbang,
            stops: [manggarai, tanahAbang],
            stopCount: 2,
            distanceKm: 5.0,
            durationMinutes: 13,
            fareIdr: 3000,
            instruction: 'Naik KRL Lin Cikarang menuju Stasiun Tanah Abang',
          },
        ],
      };

      const legs = convertRoutePlanToLegs(mockRoutePlan);
      expect(legs.length).toBeGreaterThan(0);

      // The second transit leg is from Manggarai to Tanah Abang on Lin Cikarang
      const cikarangLeg = legs.find(
        (l) => l.from?.id === 'krl_manggarai' && l.type === 'TRANSIT'
      );
      expect(cikarangLeg).toBeDefined();
      expect(cikarangLeg?.platformGuidance).toBeDefined();
      expect(cikarangLeg?.platformGuidance?.platform).toBe('Jalur 1 & 2');
    });
  });

  describe('Adaptive Battery Saver Store State', () => {
    beforeEach(() => {
      useTransitStore.getState().setBatterySaverMode(false);
    });

    it('toggles battery saver mode properly', () => {
      expect(useTransitStore.getState().isBatterySaverMode).toBe(false);

      useTransitStore.getState().toggleBatterySaverMode();
      expect(useTransitStore.getState().isBatterySaverMode).toBe(true);

      useTransitStore.getState().toggleBatterySaverMode();
      expect(useTransitStore.getState().isBatterySaverMode).toBe(false);
    });

    it('sets battery saver mode explicitly', () => {
      useTransitStore.getState().setBatterySaverMode(true);
      expect(useTransitStore.getState().isBatterySaverMode).toBe(true);

      useTransitStore.getState().setBatterySaverMode(false);
      expect(useTransitStore.getState().isBatterySaverMode).toBe(false);
    });
  });
});
