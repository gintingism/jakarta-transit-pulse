import { describe, it, expect } from 'vitest';
import {
  calculateKrlFare,
  calculateTransJakartaFare,
  calculateBasoettaFare,
  calculateTotalJourneyFare,
  JourneyLeg,
} from './fareRules';

describe('Jakarta Transit Pulse - Official Multi-Modal Fare Rules', () => {
  describe('1. KRL Commuter Line Jabodetabek (Bogor, Cikarang Loop, Tangerang)', () => {
    it('calculates Rp 3.000 for trips within the first 25 km (Bekasi to Manggarai ~15 km)', () => {
      expect(calculateKrlFare(15)).toBe(3000);
      expect(calculateKrlFare(25)).toBe(3000);
      expect(calculateKrlFare(5)).toBe(3000);
    });

    it('calculates Rp 5.000 for Cikarang to Manggarai (~43 km: 25 km base + 2x10 km tiers)', () => {
      // 43 km = 25 km (Rp 3.000) + 18 km -> 2 tiers of 10 km (+Rp 2.000) = Rp 5.000
      expect(calculateKrlFare(43)).toBe(5000);
    });

    it('calculates Rp 6.000 for Bogor to Jakarta Kota (~55 km: 25 km base + 3x10 km tiers)', () => {
      // 55 km = 25 km (Rp 3.000) + 30 km -> 3 tiers of 10 km (+Rp 3.000) = Rp 6.000
      expect(calculateKrlFare(55)).toBe(6000);
    });

    it('handles exact boundary distances (25.0, 25.1, 35.0, 35.1)', () => {
      expect(calculateKrlFare(25.0)).toBe(3000);
      expect(calculateKrlFare(25.1)).toBe(4000);
      expect(calculateKrlFare(35.0)).toBe(4000);
      expect(calculateKrlFare(35.1)).toBe(5000);
    });

    it('handles boundary testing: distance 0 km or negative returns Rp 0', () => {
      expect(calculateKrlFare(0)).toBe(0);
      expect(calculateKrlFare(-10)).toBe(0);
    });
  });

  describe('2. TransJakarta BRT (Koridor 1 & koridor utama)', () => {
    it('returns standard flat fare of Rp 3.500', () => {
      expect(calculateTransJakartaFare()).toBe(3500);
    });
  });

  describe('3. Commuter Line Basoetta (Kereta Bandara Soekarno-Hatta - Layanan Tunggal)', () => {
    it('calculates Rp 70.000 from Manggarai to Bandara Soekarno-Hatta', () => {
      expect(calculateBasoettaFare('krl_manggarai', 'ka_bandara_shia')).toBe(70000);
      // Symmetric check
      expect(calculateBasoettaFare('ka_bandara_shia', 'krl_manggarai')).toBe(70000);
    });

    it('calculates Rp 70.000 from BNI City to Bandara Soekarno-Hatta', () => {
      expect(calculateBasoettaFare('krl_bni_city', 'ka_bandara_shia')).toBe(70000);
      expect(calculateBasoettaFare('ka_bandara_shia', 'krl_bni_city')).toBe(70000);
    });

    it('calculates Rp 70.000 from Duri to Bandara Soekarno-Hatta', () => {
      expect(calculateBasoettaFare('krl_duri', 'ka_bandara_shia')).toBe(70000);
      expect(calculateBasoettaFare('ka_bandara_shia', 'krl_duri')).toBe(70000);
    });

    it('calculates Rp 35.000 from Batu Ceper to Bandara Soekarno-Hatta', () => {
      expect(calculateBasoettaFare('krl_batuceper', 'ka_bandara_shia')).toBe(35000);
      expect(calculateBasoettaFare('ka_bandara_shia', 'krl_batuceper')).toBe(35000);
    });

    it('calculates Rp 35.000 from Rawa Buaya to Bandara Soekarno-Hatta', () => {
      expect(calculateBasoettaFare('krl_rawa_buaya', 'ka_bandara_shia')).toBe(35000);
      expect(calculateBasoettaFare('ka_bandara_shia', 'krl_rawa_buaya')).toBe(35000);
    });

    it('calculates Rp 35.000 for inter-station city segment (e.g. Manggarai to Batu Ceper)', () => {
      expect(calculateBasoettaFare('krl_manggarai', 'krl_batuceper')).toBe(35000);
      expect(calculateBasoettaFare('krl_batuceper', 'krl_manggarai')).toBe(35000);
    });

    it('calculates Rp 10.000 for short city segment (e.g. Manggarai to Duri, Manggarai to BNI City)', () => {
      expect(calculateBasoettaFare('krl_manggarai', 'krl_duri')).toBe(10000);
      expect(calculateBasoettaFare('krl_duri', 'krl_manggarai')).toBe(10000);
      expect(calculateBasoettaFare('krl_manggarai', 'krl_bni_city')).toBe(10000);
    });

    it('handles boundary: same station circular trip returns Rp 0', () => {
      expect(calculateBasoettaFare('krl_manggarai', 'krl_manggarai')).toBe(0);
      expect(calculateBasoettaFare('ka_bandara_shia', 'ka_bandara_shia')).toBe(0);
    });

    it('handles boundary: throws descriptive error on unknown station ID', () => {
      expect(() => calculateBasoettaFare('unknown_station', 'ka_bandara_shia')).toThrow(
        /Stasiun tidak dikenal/
      );
      expect(() => calculateBasoettaFare('krl_manggarai', 'unknown_station')).toThrow(
        /Stasiun tidak dikenal/
      );
    });
  });

  describe('4. Total Tarif Perjalanan Multi-Moda (calculateTotalJourneyFare)', () => {
    it('calculates KRL Bekasi ke Manggarai (Rp 3.000) transit Basoetta ke Bandara Soetta (Rp 70.000) -> Rp 73.000', () => {
      const legs: JourneyLeg[] = [
        {
          mode: 'krl',
          fromStationId: 'krl_bekasi',
          toStationId: 'krl_manggarai',
          distanceKm: 15,
        },
        {
          mode: 'basoetta',
          fromStationId: 'krl_manggarai',
          toStationId: 'ka_bandara_shia',
        },
      ];

      expect(calculateTotalJourneyFare(legs)).toBe(73000);
    });

    it('calculates KRL Bekasi ke Sudirman (Rp 3.000) transit jalan kaki Dukuh Atas ke TJ Koridor 1 Harmoni (Rp 3.500) -> Rp 6.500', () => {
      const legs: JourneyLeg[] = [
        {
          mode: 'krl',
          fromStationId: 'krl_bekasi',
          toStationId: 'krl_sudirman',
          distanceKm: 15,
        },
        {
          mode: 'tj',
          fromStationId: 'tj_dukuh_atas',
          toStationId: 'tj_harmoni',
        },
      ];

      expect(calculateTotalJourneyFare(legs)).toBe(6500);
    });

    it('handles boundary: empty journey legs returns Rp 0', () => {
      expect(calculateTotalJourneyFare([])).toBe(0);
    });

    it('handles 3-modal trip: KRL Bogor ke Manggarai + KRL Manggarai ke Duri + Basoetta ke Bandara', () => {
      const legs: JourneyLeg[] = [
        {
          mode: 'krl',
          fromStationId: 'krl_bogor',
          toStationId: 'krl_manggarai',
          distanceKm: 44, // 25 km (3000) + 2x10 km (2000) = 5000
        },
        {
          mode: 'basoetta',
          fromStationId: 'krl_manggarai',
          toStationId: 'ka_bandara_shia', // 70000
        },
      ];

      expect(calculateTotalJourneyFare(legs)).toBe(75000);
    });
  });
});
