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
 * Skema tarif resmi sesuai relasi stasiun (Origin-Destination):
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
  // Ke / Dari Bandara Soekarno-Hatta (BST)
  // Manggarai (MRI) <-> Bandara Soetta (BST): Rp 70.000
  // BNI City (BNC) <-> Bandara Soetta (BST): Rp 70.000
  // Duri (DU) <-> Bandara Soetta (BST): Rp 70.000
  'ka_bandara_shia_krl_manggarai': 70000,
  'ka_bandara_shia_krl_bni_city': 70000,
  'ka_bandara_shia_krl_duri': 70000,

  // Rawa Buaya (RW) <-> Bandara Soetta (BST): Rp 35.000
  // Batu Ceper (BPR) <-> Bandara Soetta (BST): Rp 35.000
  'ka_bandara_shia_krl_batuceper': 35000,
  'ka_bandara_shia_krl_rawa_buaya': 35000,

  // Perjalanan Antarstasiun Kota (Non-Bandara)
  // Manggarai / BNI City / Duri <-> Batu Ceper: Rp 35.000
  'krl_batuceper_krl_manggarai': 35000,
  'krl_batuceper_krl_bni_city': 35000,
  'krl_batuceper_krl_duri': 35000,

  // Manggarai / BNI City <-> Rawa Buaya: Rp 25.000
  'krl_manggarai_krl_rawa_buaya': 25000,
  'krl_bni_city_krl_rawa_buaya': 25000,

  // Duri <-> Rawa Buaya: Rp 15.000
  'krl_duri_krl_rawa_buaya': 15000,

  // Manggarai <-> BNI City: Rp 10.000
  // Manggarai <-> Duri: Rp 10.000
  // BNI City <-> Duri: Rp 10.000
  // Rawa Buaya <-> Batu Ceper: Rp 10.000
  'krl_bni_city_krl_manggarai': 10000,
  'krl_duri_krl_manggarai': 10000,
  'krl_bni_city_krl_duri': 10000,
  'krl_batuceper_krl_rawa_buaya': 10000,
};

export interface BasoettaPaymentInfo {
  methods: string[];
  kmtMinBalance: number;
  notes: string;
}

export const BASOETTA_PAYMENT_INFO: BasoettaPaymentInfo = {
  methods: [
    'Kartu Multi Trip (KMT) Tap and Go',
    'Aplikasi Access by KAI',
    'Vending Machine Stasiun',
  ],
  kmtMinBalance: 70000,
  notes: 'KMT Tap and Go membutuhkan minimal saldo Rp 70.000 saat tap-in.',
};

function getOdKey(stnA: string, stnB: string): string {
  return [stnA, stnB].sort().join('_');
}

/**
 * Menghitung tarif resmi Commuter Line Basoetta sesuai relasi stasiun.
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
  let runningKrlDist = 0;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    if (leg.mode === 'krl') {
      runningKrlDist += leg.distanceKm ?? 0;
      const nextLeg = legs[i + 1];
      if (!nextLeg || nextLeg.mode !== 'krl') {
        total += calculateKrlFare(runningKrlDist);
        runningKrlDist = 0;
      }
      continue;
    }

    switch (leg.mode) {
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

  // Consolidate contiguous KRL legs for single tap-in/tap-out fare schedule
  let currentKrlGroup: { indices: number[]; totalDist: number } | null = null;
  const krlGroups: { indices: number[]; totalDist: number }[] = [];

  legs.forEach((leg, idx) => {
    if (leg.mode === 'krl') {
      if (!currentKrlGroup) {
        currentKrlGroup = { indices: [idx], totalDist: leg.distanceKm ?? 0 };
      } else {
        currentKrlGroup.indices.push(idx);
        currentKrlGroup.totalDist += leg.distanceKm ?? 0;
      }
    } else {
      if (currentKrlGroup) {
        krlGroups.push(currentKrlGroup);
        currentKrlGroup = null;
      }
    }
  });
  if (currentKrlGroup) {
    krlGroups.push(currentKrlGroup);
  }

  const breakdown: FareLegBreakdown[] = [];
  let totalFare = 0;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    let legFare = 0;
    let description = '';

    switch (leg.mode) {
      case 'krl': {
        const group = krlGroups.find((g) => g.indices.includes(i));
        const isFirstInGroup = group ? group.indices[0] === i : true;
        const totalDist = group ? group.totalDist : (leg.distanceKm ?? 0);

        if (isFirstInGroup) {
          legFare = calculateKrlFare(totalDist);
          description =
            group && group.indices.length > 1
              ? `KRL Commuterline (Terusan Transit, ${totalDist.toFixed(1)} km)`
              : `KRL Commuterline (${totalDist.toFixed(1)} km)`;
        } else {
          legFare = 0;
          description = 'Transit Peron KRL (Terusan - Bebas Biaya)';
        }
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
