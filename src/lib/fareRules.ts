/**
 * Jakarta Transit Pulse - Official Transit Fare Engine
 * Pure, deterministic Indonesian transit fare calculation rules.
 * Zero DOM or React dependencies. Fully unit-testable.
 */

export type TransitMode = 'krl' | 'tj' | 'basoetta' | 'kai-bandara' | 'mrt' | 'lrt';

export interface JourneyLeg {
  mode: TransitMode;
  fromStationId?: string;
  toStationId?: string;
  distanceKm?: number;
  stopCount?: number;
  lineId?: string;
}

// Backward-compatibility aliases
export type TransitFareMode = TransitMode;
export type MultiModalFareLeg = JourneyLeg;

export interface FareLegBreakdown {
  mode: TransitMode;
  fromStationId?: string;
  toStationId?: string;
  distanceKm?: number;
  fare: number;
  description: string;
}

export interface MultiModalFareResult {
  totalFare: number;
  breakdown: FareLegBreakdown[];
  currency: 'IDR';
}

/**
 * 1. KRL Commuter Line Jabodetabek (Bogor Line, Cikarang Loop Line, Tangerang Line)
 * Rumus progresif resmi Kepmenhub:
 * - 25 km pertama = Rp 3.000
 * - Setiap kelipatan 10 km berikutnya atau pecahannya = +Rp 1.000
 *
 * @param distanceKm Total jarak perjalanan KRL dalam kilometer
 * @returns Tarif KRL dalam IDR (Rp)
 */
export function calculateKrlFare(distanceKm: number): number {
  if (distanceKm <= 0 || !Number.isFinite(distanceKm)) {
    return 0;
  }

  if (distanceKm <= 25) {
    return 3000;
  }

  const additionalDistance = distanceKm - 25;
  const additionalTiers = Math.ceil(additionalDistance / 10);
  return 3000 + additionalTiers * 1000;
}

/**
 * 2. TransJakarta BRT (Koridor 1 & koridor utama)
 * Pergub DKI Jakarta: Tarif flat standar Rp 3.500.
 *
 * @returns Tarif TransJakarta dalam IDR (Rp)
 */
export function calculateTransJakartaFare(): number {
  return 3500;
}

// Backward-compatibility helper for TransJakarta
export function calculateTjFare(departureTime?: Date | string): number {
  if (!departureTime) {
    return 3500;
  }

  let hours = -1;
  let minutes = -1;

  if (typeof departureTime === 'string') {
    const timeMatch = departureTime.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    } else {
      const parsedDate = new Date(departureTime);
      if (!isNaN(parsedDate.getTime())) {
        const utcHours = parsedDate.getUTCHours();
        hours = (utcHours + 7) % 24;
        minutes = parsedDate.getUTCMinutes();
      }
    }
  } else if (departureTime instanceof Date && !isNaN(departureTime.getTime())) {
    const utcHours = departureTime.getUTCHours();
    hours = (utcHours + 7) % 24;
    minutes = departureTime.getUTCMinutes();
  }

  if (hours >= 0 && minutes >= 0) {
    // 05.00 - 07.00 WIB
    if (hours === 5 || hours === 6) {
      return 2000;
    }
  }

  return 3500;
}

/**
 * 3. Commuter Line Basoetta (Kereta Bandara Soekarno-Hatta)
 * Layanan tunggal (Single Class) - Hapus pemisahan Eksekutif/Premium.
 * Skema matriks relasi stasiun (Origin-Destination):
 * - Manggarai / BNI City / Duri <-> Bandara Soetta = Rp 70.000
 * - Rawa Buaya / Batu Ceper <-> Bandara Soetta = Rp 35.000
 * - Antarstasiun segmen kota (contoh: Manggarai <-> Batu Ceper) = Rp 35.000
 * - Antarstasiun pendek kota (contoh: Manggarai <-> Duri) = Rp 10.000
 */
const BASOETTA_STATIONS = new Set([
  'krl_manggarai',
  'krl_bni_city',
  'krl_duri',
  'krl_rawa_buaya',
  'krl_batuceper',
  'ka_bandara_shia',
]);

// Sorted OD key lookup table: sorted [stationA, stationB].join('_') -> fare (IDR)
const BASOETTA_OD_FARES: Record<string, number> = {
  // Downtown to Airport = Rp 70.000
  'ka_bandara_shia_krl_manggarai': 70000,
  'ka_bandara_shia_krl_bni_city': 70000,
  'ka_bandara_shia_krl_duri': 70000,

  // West Jakarta & Tangerang to Airport = Rp 35.000
  'ka_bandara_shia_krl_batuceper': 35000,
  'ka_bandara_shia_krl_rawa_buaya': 35000,

  // Inter-station city segments = Rp 35.000
  'krl_batuceper_krl_manggarai': 35000,
  'krl_batuceper_krl_bni_city': 35000,
  'krl_batuceper_krl_duri': 35000,
  'krl_manggarai_krl_rawa_buaya': 35000,
  'krl_bni_city_krl_rawa_buaya': 35000,
  'krl_duri_krl_rawa_buaya': 35000,

  // Short city segments = Rp 10.000
  'krl_bni_city_krl_manggarai': 10000,
  'krl_duri_krl_manggarai': 10000,
  'krl_bni_city_krl_duri': 10000,
  'krl_batuceper_krl_rawa_buaya': 10000,
};

function getOdKey(stnA: string, stnB: string): string {
  return [stnA, stnB].sort().join('_');
}

/**
 * Calculates deterministic fare for Commuter Line Basoetta (Single unified class).
 *
 * @param originStationId ID Stasiun keberangkatan
 * @param destStationId ID Stasiun tujuan
 * @returns Tarif dalam IDR (Rp)
 */
export function calculateBasoettaFare(
  originStationId: string,
  destStationId: string
): number {
  if (!BASOETTA_STATIONS.has(originStationId)) {
    throw new Error(`Stasiun tidak dikenal untuk rute KAI Bandara: ${originStationId}`);
  }
  if (!BASOETTA_STATIONS.has(destStationId)) {
    throw new Error(`Stasiun tidak dikenal untuk rute KAI Bandara: ${destStationId}`);
  }

  // Circular trip / same station
  if (originStationId === destStationId) {
    return 0;
  }

  const key = getOdKey(originStationId, destStationId);
  const fare = BASOETTA_OD_FARES[key];

  if (fare !== undefined) {
    return fare;
  }

  // Safe fallback if unlisted OD pair
  return 70000;
}

// Backward-compatibility alias
export function calculateKaiBandaraFare(
  originStationId: string,
  destStationId: string,
  _serviceType?: string
): number {
  return calculateBasoettaFare(originStationId, destStationId);
}

/**
 * 4. Total Tarif Perjalanan Multi-Moda (calculateTotalJourneyFare)
 * Menghitung total akumulatif dari setiap potongan moda perjalanan tanpa diskon tersembunyi.
 *
 * @param legs Daftar segmen perjalanan
 * @returns Total tarif dalam IDR (Rp)
 */
export function calculateTotalJourneyFare(legs: JourneyLeg[]): number {
  if (!legs || legs.length === 0) {
    return 0;
  }

  let total = 0;

  for (const leg of legs) {
    switch (leg.mode) {
      case 'krl': {
        total += calculateKrlFare(leg.distanceKm ?? 0);
        break;
      }

      case 'tj': {
        total += calculateTransJakartaFare();
        break;
      }

      case 'basoetta':
      case 'kai-bandara': {
        if (leg.fromStationId && leg.toStationId) {
          total += calculateBasoettaFare(leg.fromStationId, leg.toStationId);
        } else {
          total += 70000;
        }
        break;
      }

      case 'mrt': {
        const stops = Math.max(0, (leg.stopCount ?? 1) - 1);
        total += Math.min(14000, Math.max(3000, 3000 + stops * 1000));
        break;
      }

      case 'lrt': {
        const dist = leg.distanceKm ?? 0;
        if (leg.lineId === 'lrt-jakarta' || (!leg.lineId && dist <= 6)) {
          total += 5000;
        } else if (dist <= 1) {
          total += 5000;
        } else {
          total += Math.min(20000, 5000 + Math.ceil(dist - 1) * 700);
        }
        break;
      }

      default:
        break;
    }
  }

  return total;
}

/**
 * Backward-compatible MultiModalFare calculator returning detailed breakdown.
 */
export function calculateMultiModalFare(
  legs: JourneyLeg[],
  options?: { departureTime?: Date | string }
): MultiModalFareResult {
  if (!legs || legs.length === 0) {
    return {
      totalFare: 0,
      breakdown: [],
      currency: 'IDR',
    };
  }

  const breakdown: FareLegBreakdown[] = [];
  let totalFare = 0;

  for (const leg of legs) {
    let legFare = 0;
    let description = '';

    switch (leg.mode) {
      case 'krl': {
        const dist = leg.distanceKm ?? 0;
        legFare = calculateKrlFare(dist);
        description = `KRL Commuterline (${dist.toFixed(1)} km)`;
        break;
      }

      case 'tj': {
        legFare = options?.departureTime
          ? calculateTjFare(options.departureTime)
          : calculateTransJakartaFare();
        description =
          legFare === 2000
            ? 'TransJakarta BRT (Promo Pagi 05:00-07:00)'
            : 'TransJakarta BRT (Tarif Flat Rp 3.500)';
        break;
      }

      case 'basoetta':
      case 'kai-bandara': {
        if (leg.fromStationId && leg.toStationId) {
          legFare = calculateBasoettaFare(leg.fromStationId, leg.toStationId);
        } else {
          legFare = 70000;
        }
        description = 'Commuter Line Basoetta (Kereta Bandara)';
        break;
      }

      case 'mrt': {
        const stops = Math.max(0, (leg.stopCount ?? 1) - 1);
        legFare = Math.min(14000, Math.max(3000, 3000 + stops * 1000));
        description = `MRT Jakarta (${stops + 1} stasiun)`;
        break;
      }

      case 'lrt': {
        const dist = leg.distanceKm ?? 0;
        if (leg.lineId === 'lrt-jakarta' || (!leg.lineId && dist <= 6)) {
          legFare = 5000;
          description = 'LRT Jakarta (Tarif Flat)';
        } else if (dist <= 1) {
          legFare = 5000;
          description = `LRT Jabodebek (${dist.toFixed(1)} km)`;
        } else {
          legFare = Math.min(20000, 5000 + Math.ceil(dist - 1) * 700);
          description = `LRT Jabodebek (${dist.toFixed(1)} km)`;
        }
        break;
      }

      default: {
        legFare = 0;
        description = 'Transit Transfer / Jalan Kaki';
        break;
      }
    }

    breakdown.push({
      mode: leg.mode,
      fromStationId: leg.fromStationId,
      toStationId: leg.toStationId,
      distanceKm: leg.distanceKm,
      fare: legFare,
      description,
    });

    totalFare += legFare;
  }

  return {
    totalFare,
    breakdown,
    currency: 'IDR',
  };
}
