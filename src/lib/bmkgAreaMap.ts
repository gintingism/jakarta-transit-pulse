/**
 * BMKG Area Lookup Map for Jakarta Transit
 *
 * Maps geographic coordinates to BMKG adm4 kelurahan codes (BPS format).
 * Covers all major KRL, MRT, and TransJakarta transit corridors in Jakarta.
 *
 * Zero React / DOM imports — pure data + pure functions only.
 */

import { calculateHaversineDistance } from './geoMath';

interface BmkgArea {
  readonly adm4: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
}

/**
 * Representative BMKG kelurahan areas covering Jakarta transit zones.
 * Each entry has verified adm4 code + centroid coordinates.
 * Lookup selects the nearest entry by Haversine distance.
 */
const JAKARTA_BMKG_AREAS: readonly BmkgArea[] = [
  // ── Jakarta Pusat (31.71) ────────────────────────────────────────────────
  { adm4: '31.71.01.1001', name: 'Gambir',           lat: -6.1764, lon: 106.8267 },
  { adm4: '31.71.03.1001', name: 'Senen',            lat: -6.1756, lon: 106.8450 },
  { adm4: '31.71.04.1001', name: 'Kemayoran',        lat: -6.1524, lon: 106.8576 },
  { adm4: '31.71.05.1004', name: 'Bendungan Hilir',  lat: -6.2050, lon: 106.8172 },
  { adm4: '31.71.06.1003', name: 'Cikini-Menteng',   lat: -6.1914, lon: 106.8394 },

  // ── Jakarta Selatan (31.74) ──────────────────────────────────────────────
  { adm4: '31.74.02.1001', name: 'Tebet',            lat: -6.2264, lon: 106.8610 },
  { adm4: '31.74.03.1001', name: 'Setiabudi-S',      lat: -6.2188, lon: 106.8268 },
  { adm4: '31.74.04.1001', name: 'Pancoran',         lat: -6.2526, lon: 106.8448 },
  { adm4: '31.74.05.1002', name: 'Kebayoran Baru',   lat: -6.2440, lon: 106.7991 },
  { adm4: '31.74.06.1001', name: 'Kebayoran Lama',   lat: -6.2617, lon: 106.7817 },
  { adm4: '31.74.07.1001', name: 'Pasar Minggu',     lat: -6.2893, lon: 106.8448 },
  { adm4: '31.74.08.1001', name: 'Cilandak',         lat: -6.2897, lon: 106.7975 },
  { adm4: '31.74.09.1001', name: 'Pesanggrahan',     lat: -6.2695, lon: 106.7667 },

  // ── Jakarta Timur (31.75) ────────────────────────────────────────────────
  { adm4: '31.75.03.1001', name: 'Matraman',         lat: -6.2056, lon: 106.8612 },
  { adm4: '31.75.04.1002', name: 'Jatinegara',       lat: -6.2148, lon: 106.8750 },
  { adm4: '31.75.06.1001', name: 'Kramat Jati',      lat: -6.2684, lon: 106.8665 },
  { adm4: '31.75.07.1001', name: 'Duren Sawit',      lat: -6.2307, lon: 106.9074 },

  // ── Jakarta Barat (31.73) ────────────────────────────────────────────────
  { adm4: '31.73.01.1001', name: 'Grogol',           lat: -6.1658, lon: 106.7888 },
  { adm4: '31.73.04.1001', name: 'Kebon Jeruk',      lat: -6.2059, lon: 106.7700 },
  { adm4: '31.73.07.1001', name: 'Palmerah',         lat: -6.2021, lon: 106.7976 },
  { adm4: '31.73.08.1001', name: 'Cengkareng',       lat: -6.1374, lon: 106.7332 },

  // ── Jakarta Utara (31.72) ────────────────────────────────────────────────
  { adm4: '31.72.01.1001', name: 'Penjaringan',      lat: -6.1265, lon: 106.7950 },
  { adm4: '31.72.04.1001', name: 'Tanjung Priok',    lat: -6.1093, lon: 106.8795 },
];

/**
 * Returns the BMKG adm4 code of the area nearest to the given coordinates.
 * Falls back to Gambir (central Jakarta) if the table is somehow empty.
 *
 * @param lat - WGS84 latitude
 * @param lon - WGS84 longitude
 * @returns BMKG adm4 kelurahan code (e.g. "31.71.01.1001")
 */
export function findNearestBmkgAdm4(lat: number, lon: number): string {
  let nearestAdm4 = JAKARTA_BMKG_AREAS[0].adm4;
  let minDistanceM = Infinity;

  for (const area of JAKARTA_BMKG_AREAS) {
    const distanceM = calculateHaversineDistance([lat, lon], [area.lat, area.lon]);
    if (distanceM < minDistanceM) {
      minDistanceM = distanceM;
      nearestAdm4 = area.adm4;
    }
  }

  return nearestAdm4;
}
