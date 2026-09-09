/**
 * Pure Open-Meteo Transit Weather Service
 * 100% Free, no API key required, zero authentication.
 * Provides live weather, temperature, and rain alerts for Jakarta transit stations.
 */

export interface TransitWeather {
  temperatureC: number;
  humidityPercent: number;
  weatherCode: number;
  conditionText: string;
  isRaining: boolean;
  rainMm: number;
  advisoryText: string;
  icon: string;
}

interface OpenMeteoCurrentResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
  };
}

/**
 * Maps WMO weather interpretation codes to Indonesian descriptions and transit advisories.
 */
export function interpretWmoWeatherCode(code: number, rainMm: number = 0): {
  conditionText: string;
  isRaining: boolean;
  advisoryText: string;
  icon: string;
} {
  // WMO Codes:
  // 0: Clear sky
  // 1, 2, 3: Mainly clear, partly cloudy, and overcast
  // 45, 48: Fog
  // 51, 53, 55: Drizzle
  // 61, 63, 65: Rain: Slight, moderate, heavy
  // 80, 81, 82: Rain showers: Slight, moderate, violent
  // 95, 96, 99: Thunderstorm

  if (code === 0) {
    return {
      conditionText: 'Cerah',
      isRaining: false,
      advisoryText: 'Cuaca cerah, perjalanan nyaman.',
      icon: '☀️',
    };
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
    return {
      conditionText: 'Gerimis Ringan',
      isRaining: true,
      advisoryText: 'Gerimis di area transit, siapkan payung.',
      icon: '🌦️',
    };
  }

  if (code >= 61 && code <= 65) {
    const intensity = code === 61 ? 'Hujan Ringan' : code === 63 ? 'Hujan Sedang' : 'Hujan Lebat';
    return {
      conditionText: intensity,
      isRaining: true,
      advisoryText: 'Gunakan jembatan penyeberangan beratap & skybridge terintegrasi.',
      icon: '🌧️',
    };
  }

  if (code >= 80 && code <= 82) {
    return {
      conditionText: 'Hujan Lokal',
      isRaining: true,
      advisoryText: 'Hujan mengguyur stasiun tujuan, sediakan jas hujan/payung.',
      icon: '🌧️',
    };
  }

  if (code >= 95) {
    return {
      conditionText: 'Badai Petir',
      isRaining: true,
      advisoryText: 'Waspada genangan air di sekitar halte/stasiun.',
      icon: '⛈️',
    };
  }

  if (rainMm > 0) {
    return {
      conditionText: 'Hujan',
      isRaining: true,
      advisoryText: 'Sedang hujan di stasiun tujuan.',
      icon: '🌧️',
    };
  }

  return {
    conditionText: 'Berawan',
    isRaining: false,
    advisoryText: 'Kondisi operasional normal.',
    icon: '☁️',
  };
}

/**
 * Fetches real-time weather from Open-Meteo for given coordinates.
 */
export async function fetchStationWeather(
  coords: [number, number],
  options?: { signal?: AbortSignal }
): Promise<TransitWeather | null> {
  const [lat, lng] = coords;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=Asia%2FJakarta`;

  try {
    const res = await fetch(url, {
      signal: options?.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as OpenMeteoCurrentResponse;
    if (!data.current) {
      return null;
    }

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
    };
  } catch {
    // Graceful offline fallback
    return null;
  }
}
