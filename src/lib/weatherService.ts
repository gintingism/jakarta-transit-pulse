/**
 * Transit Weather Service
 *
 * Primary  : BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) Indonesia
 *            — hyper-local, Indonesian-language, 3-hourly forecast, no API key.
 * Fallback : Open-Meteo (global, WMO-coded, no API key).
 *
 * Pure module — zero React / DOM / Leaflet imports.
 */

import { findNearestBmkgAdm4 } from './bmkgAreaMap';

// ── Shared output type ───────────────────────────────────────────────────────

export interface TransitWeather {
  temperatureC: number;
  humidityPercent: number;
  weatherCode: number;
  conditionText: string;
  isRaining: boolean;
  rainMm: number;
  advisoryText: string;
  icon: string;
  source: 'bmkg' | 'open-meteo';
}

// ── BMKG types ───────────────────────────────────────────────────────────────

interface BmkgWeatherSlot {
  datetime: string;       // UTC ISO-8601, e.g. "2026-09-09T04:00:00Z"
  t: number;              // temperature °C
  hu: number;             // relative humidity %
  tp: number;             // precipitation mm
  weather: number;        // BMKG weather code
  weather_desc: string;   // Indonesian description
  weather_desc_en: string;
}

interface BmkgResponse {
  data?: {
    cuaca?: BmkgWeatherSlot[][];
  }[];
}

// ── Open-Meteo types ─────────────────────────────────────────────────────────

interface OpenMeteoCurrentResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
  };
}

// ── BMKG code helpers ────────────────────────────────────────────────────────

/**
 * Derives transit advisory text and emoji icon from a BMKG weather code.
 * BMKG codes: 0-4 = clear/cloudy, 5/10/45 = haze/fog, 60-63 = rain,
 * 80 = local rain, 95/97 = thunderstorm.
 */
function interpretBmkgCode(code: number, tp: number): { icon: string; isRaining: boolean; advisoryText: string } {
  if (code <= 2) {
    return { icon: code === 0 || code === 1 ? '☀️' : '⛅', isRaining: false, advisoryText: 'Cuaca cerah, perjalanan nyaman.' };
  }
  if (code <= 4) {
    return { icon: '☁️', isRaining: false, advisoryText: 'Berawan, suhu sejuk untuk berjalan kaki.' };
  }
  if (code === 5 || code === 10) {
    return { icon: '🌫️', isRaining: false, advisoryText: 'Udara kabur/asap, jarak pandang terbatas.' };
  }
  if (code === 45) {
    return { icon: '🌫️', isRaining: false, advisoryText: 'Kabut, hati-hati saat berjalan ke stasiun.' };
  }
  if (code >= 60 && code <= 63) {
    return { icon: '🌧️', isRaining: true, advisoryText: 'Hujan di area transit, siapkan payung.' };
  }
  if (code === 80) {
    return { icon: '🌦️', isRaining: true, advisoryText: 'Hujan lokal di stasiun tujuan, cek kondisi setempat.' };
  }
  if (code === 95 || code === 97) {
    return { icon: '⛈️', isRaining: true, advisoryText: 'Waspada! Hujan petir — gunakan skybridge/terowongan stasiun.' };
  }
  // fallback based on precipitation amount
  if (tp > 0) {
    return { icon: '🌧️', isRaining: true, advisoryText: 'Sedang hujan di stasiun tujuan, siapkan payung.' };
  }
  return { icon: '⛅', isRaining: false, advisoryText: 'Kondisi operasional normal.' };
}

/**
 * Finds the weather slot closest to current UTC time from BMKG nested array.
 */
function findCurrentBmkgSlot(cuaca: BmkgWeatherSlot[][]): BmkgWeatherSlot | null {
  const now = Date.now();
  let closest: BmkgWeatherSlot | null = null;
  let minDiff = Infinity;

  for (const day of cuaca) {
    for (const slot of day) {
      const slotMs = new Date(slot.datetime).getTime();
      const diff = Math.abs(slotMs - now);
      if (diff < minDiff) {
        minDiff = diff;
        closest = slot;
      }
    }
  }

  return closest;
}

// ── WMO code helper (Open-Meteo fallback) ───────────────────────────────────

/**
 * Maps WMO weather interpretation codes to Indonesian descriptions and transit advisories.
 */
export function interpretWmoWeatherCode(code: number, rainMm: number = 0): {
  conditionText: string;
  isRaining: boolean;
  advisoryText: string;
  icon: string;
} {
  if (code === 0) {
    return { conditionText: 'Cerah', isRaining: false, advisoryText: 'Cuaca cerah, perjalanan nyaman.', icon: '☀️' };
  }
  if (code <= 3) {
    return {
      conditionText: code === 1 ? 'Cerah Berawan' : code === 2 ? 'Berawan Sebagian' : 'Berawan Mendung',
      isRaining: false,
      advisoryText: 'Cuaca berawan sejuk untuk berjalan kaki.',
      icon: '⛅',
    };
  }
  if (code >= 51 && code <= 55) {
    return { conditionText: 'Gerimis Ringan', isRaining: true, advisoryText: 'Gerimis di area transit, siapkan payung.', icon: '🌦️' };
  }
  if (code >= 61 && code <= 65) {
    const intensity = code === 61 ? 'Hujan Ringan' : code === 63 ? 'Hujan Sedang' : 'Hujan Lebat';
    return { conditionText: intensity, isRaining: true, advisoryText: 'Gunakan jembatan penyeberangan beratap & skybridge terintegrasi.', icon: '🌧️' };
  }
  if (code >= 80 && code <= 82) {
    return { conditionText: 'Hujan Lokal', isRaining: true, advisoryText: 'Hujan mengguyur stasiun tujuan, sediakan jas hujan/payung.', icon: '🌧️' };
  }
  if (code >= 95) {
    return { conditionText: 'Badai Petir', isRaining: true, advisoryText: 'Waspada genangan air di sekitar halte/stasiun.', icon: '⛈️' };
  }
  if (rainMm > 0) {
    return { conditionText: 'Hujan', isRaining: true, advisoryText: 'Sedang hujan di stasiun tujuan.', icon: '🌧️' };
  }
  return { conditionText: 'Berawan', isRaining: false, advisoryText: 'Kondisi operasional normal.', icon: '☁️' };
}

// ── BMKG fetch ────────────────────────────────────────────────────────────────

/**
 * Fetches real-time weather from BMKG for the nearest kelurahan to given coordinates.
 * Returns null on network failure or invalid response.
 */
async function fetchBmkgWeather(
  coords: [number, number],
  options?: { signal?: AbortSignal }
): Promise<TransitWeather | null> {
  const [lat, lon] = coords;
  const adm4 = findNearestBmkgAdm4(lat, lon);
  const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${adm4}`;

  try {
    const res = await fetch(url, {
      signal: options?.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as BmkgResponse;
    const cuaca = data.data?.[0]?.cuaca;
    if (!cuaca || cuaca.length === 0) return null;

    const slot = findCurrentBmkgSlot(cuaca);
    if (!slot) return null;

    const { icon, isRaining, advisoryText } = interpretBmkgCode(slot.weather, slot.tp);

    return {
      temperatureC: Math.round(slot.t),
      humidityPercent: Math.round(slot.hu),
      weatherCode: slot.weather,
      conditionText: slot.weather_desc,
      isRaining,
      rainMm: slot.tp,
      advisoryText,
      icon,
      source: 'bmkg',
    };
  } catch {
    return null;
  }
}

// ── Open-Meteo fetch (fallback) ───────────────────────────────────────────────

/**
 * Fetches real-time weather from Open-Meteo (global fallback).
 */
async function fetchOpenMeteoWeather(
  coords: [number, number],
  options?: { signal?: AbortSignal }
): Promise<TransitWeather | null> {
  const [lat, lng] = coords;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=Asia%2FJakarta`;

  try {
    const res = await fetch(url, {
      signal: options?.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as OpenMeteoCurrentResponse;
    if (!data.current) return null;

    const temp = Math.round(data.current.temperature_2m ?? 30);
    const humidity = Math.round(data.current.relative_humidity_2m ?? 75);
    const code = data.current.weather_code ?? 2;
    const rain = data.current.precipitation ?? 0;

    const { conditionText, isRaining, advisoryText, icon } = interpretWmoWeatherCode(code, rain);

    return {
      temperatureC: temp,
      humidityPercent: humidity,
      weatherCode: code,
      conditionText,
      isRaining,
      rainMm: rain,
      advisoryText,
      icon,
      source: 'open-meteo',
    };
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches real-time weather for a transit station coordinate.
 *
 * Strategy:
 *   1. Try BMKG (Indonesian Met Agency) — hyper-local, Indonesian language.
 *   2. On failure, fall back to Open-Meteo (global, WMO-coded).
 *   3. On total failure, returns null (UI should hide the weather widget).
 */
export async function fetchStationWeather(
  coords: [number, number],
  options?: { signal?: AbortSignal }
): Promise<TransitWeather | null> {
  const bmkg = await fetchBmkgWeather(coords, options);
  if (bmkg !== null) return bmkg;

  return fetchOpenMeteoWeather(coords, options);
}
