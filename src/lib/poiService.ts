import { STATIONS } from '@/src/data/transitNetwork';

export interface POILocation {
  id: string;
  name: string;
  label: string;
  coords: [number, number]; // [lat, lng]
  category: 'station' | 'mall' | 'office' | 'landmark' | 'hospital' | 'general';
  street?: string;
  district?: string;
}

// Curated offline landmark dictionary for immediate zero-latency resolution
export const JAKARTA_OFFLINE_LANDMARKS: POILocation[] = [
  {
    id: 'poi_bandara_soekarno_hatta',
    name: 'Bandara Internasional Soekarno-Hatta (SHIA)',
    label: 'Bandara Soekarno-Hatta (CGK), Pajang, Kota Tangerang',
    coords: [-6.12748, 106.65179],
    category: 'landmark',
    street: 'Jl. Bandara Soekarno-Hatta',
    district: 'Benda, Tangerang',
  },
  {
    id: 'poi_menara_bca',
    name: 'Menara BCA',
    label: 'Menara BCA, Jl. M.H. Thamrin No.1, Jakarta Pusat',
    coords: [-6.1967, 106.8225],
    category: 'office',
    street: 'Jl. M.H. Thamrin No.1',
    district: 'Menteng',
  },
  {
    id: 'poi_grand_indonesia',
    name: 'Grand Indonesia Shopping Town',
    label: 'Grand Indonesia, Jl. M.H. Thamrin, Jakarta Pusat',
    coords: [-6.1958, 106.8215],
    category: 'mall',
    street: 'Jl. M.H. Thamrin',
    district: 'Tanah Abang',
  },
  {
    id: 'poi_plaza_indonesia',
    name: 'Plaza Indonesia',
    label: 'Plaza Indonesia, Jl. M.H. Thamrin Kav. 28-30, Jakarta Pusat',
    coords: [-6.1935, 106.8229],
    category: 'mall',
    street: 'Jl. M.H. Thamrin Kav. 28-30',
    district: 'Menteng',
  },
  {
    id: 'poi_monas',
    name: 'Monumen Nasional (Monas)',
    label: 'Monas, Gambir, Jakarta Pusat',
    coords: [-6.1754, 106.8272],
    category: 'landmark',
    district: 'Gambir',
  },
  {
    id: 'poi_sarinah',
    name: 'Gedung Sarinah',
    label: 'Pusat Perbelanjaan Sarinah, Jl. M.H. Thamrin No.11, Jakarta Pusat',
    coords: [-6.1874, 106.8239],
    category: 'mall',
    street: 'Jl. M.H. Thamrin No.11',
    district: 'Menteng',
  },
  {
    id: 'poi_blok_m_plaza',
    name: 'Plaza Blok M',
    label: 'Plaza Blok M, Jl. Bulungan No.76, Kebayoran Baru, Jakarta Selatan',
    coords: [-6.2443, 106.7976],
    category: 'mall',
    street: 'Jl. Bulungan No.76',
    district: 'Kebayoran Baru',
  },
  {
    id: 'poi_senayan_city',
    name: 'Senayan City',
    label: 'Senayan City, Jl. Asia Afrika No.19, Gelora, Jakarta Pusat',
    coords: [-6.2273, 106.7972],
    category: 'mall',
    street: 'Jl. Asia Afrika No.19',
    district: 'Gelora',
  },
  {
    id: 'poi_gbk',
    name: 'Gelora Bung Karno (GBK)',
    label: 'Stadion Utama Gelora Bung Karno, Senayan, Jakarta Pusat',
    coords: [-6.2186, 106.8018],
    category: 'landmark',
    district: 'Tanah Abang',
  },
  {
    id: 'poi_citos',
    name: 'Cilandak Town Square (CITOS)',
    label: 'Cilandak Town Square, Jl. T.B. Simatupang, Jakarta Selatan',
    coords: [-6.2915, 106.8000],
    category: 'mall',
    street: 'Jl. T.B. Simatupang',
    district: 'Cilandak',
  },
  {
    id: 'poi_rscm',
    name: 'RSUPN Dr. Cipto Mangunkusumo (RSCM)',
    label: 'RSCM, Jl. Pangeran Diponegoro No.71, Senen, Jakarta Pusat',
    coords: [-6.1973, 106.8475],
    category: 'hospital',
    street: 'Jl. Diponegoro No.71',
    district: 'Senen',
  },
  {
    id: 'poi_ui_salemba',
    name: 'Universitas Indonesia (Kampus Salemba)',
    label: 'Universitas Indonesia Salemba, Jl. Salemba Raya, Jakarta Pusat',
    coords: [-6.1947, 106.8504],
    category: 'landmark',
    street: 'Jl. Salemba Raya',
    district: 'Senen',
  },
];

interface PhotonFeature {
  type: string;
  properties: {
    name?: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    osm_key?: string;
    osm_value?: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
}

interface PhotonResponse {
  type: string;
  features?: PhotonFeature[];
}

/**
 * Bounds checking for Greater Jakarta Area (Jabodetabek)
 */
function isWithinJabodetabek(lat: number, lng: number): boolean {
  return lat >= -6.8 && lat <= -5.9 && lng >= 106.5 && lng <= 107.4;
}

/**
 * Searches POIs across:
 * 1. Curated offline landmarks
 * 2. Official transit stations/haltes
 * 3. OpenStreetMap Photon Geocoder (Jakarta biased)
 */
export async function searchPOIs(
  query: string,
  options?: { limit?: number; signal?: AbortSignal }
): Promise<POILocation[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  const limit = options?.limit ?? 6;
  const results: POILocation[] = [];
  const seenIds = new Set<string>();

  // 1. Search Offline Curated Landmarks
  for (const poi of JAKARTA_OFFLINE_LANDMARKS) {
    if (
      poi.name.toLowerCase().includes(cleanQuery) ||
      poi.label.toLowerCase().includes(cleanQuery)
    ) {
      results.push(poi);
      seenIds.add(poi.id);
      if (results.length >= limit) return results;
    }
  }

  // 2. Search Transit Network Stations / Haltes
  for (const station of STATIONS) {
    if (
      station.name.toLowerCase().includes(cleanQuery) ||
      (station.code && station.code.toLowerCase() === cleanQuery)
    ) {
      const stationPoi: POILocation = {
        id: `station_${station.id}`,
        name: station.name,
        label: `${station.name} (${station.type.toUpperCase()})`,
        coords: station.coords,
        category: 'station',
        district: station.type === 'krl' ? 'KRL Commuterline' : 'TransJakarta BRT',
      };
      if (!seenIds.has(stationPoi.id)) {
        results.push(stationPoi);
        seenIds.add(stationPoi.id);
        if (results.length >= limit) return results;
      }
    }
  }

  // 3. Query OpenStreetMap Photon Geocoder (Free, No API Key, CORS Enabled)
  try {
    const encoded = encodeURIComponent(query.trim());
    const url = `https://photon.komoot.io/api/?q=${encoded}&lat=-6.2088&lon=106.8456&limit=${limit}`;

    const res = await fetch(url, {
      signal: options?.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = (await res.json()) as PhotonResponse;
      if (Array.isArray(data.features)) {
        for (const feat of data.features) {
          const props = feat.properties;
          const coords = feat.geometry.coordinates; // [lon, lat]
          if (!props.name || !Array.isArray(coords) || coords.length < 2) {
            continue;
          }

          const [lon, lat] = coords;
          if (!isWithinJabodetabek(lat, lon)) {
            continue;
          }

          const id = `photon_${props.name.toLowerCase().replace(/\s+/g, '_')}_${lat.toFixed(4)}_${lon.toFixed(4)}`;
          if (seenIds.has(id)) {
            continue;
          }

          const parts = [
            props.name,
            props.street,
            props.district,
            props.city || 'Jakarta',
          ].filter(Boolean);

          let category: POILocation['category'] = 'general';
          if (props.osm_value === 'mall' || props.osm_key === 'shop') {
            category = 'mall';
          } else if (props.osm_key === 'office' || props.osm_value === 'bank') {
            category = 'office';
          } else if (props.osm_key === 'amenity' && props.osm_value === 'hospital') {
            category = 'hospital';
          }

          results.push({
            id,
            name: props.name,
            label: parts.join(', '),
            coords: [lat, lon],
            category,
            street: props.street,
            district: props.district || props.city,
          });
          seenIds.add(id);

          if (results.length >= limit) {
            break;
          }
        }
      }
    }
  } catch {
    // If external fetch fails (offline or timeout), graceful degradation to curated matches
  }

  return results;
}

/**
 * Free Reverse Geocoding via OpenStreetMap Nominatim.
 * Resolves GPS coordinates [lat, lng] into a human-readable location name in Jakarta.
 */
export async function reverseGeocodeLocation(
  coords: [number, number],
  options?: { signal?: AbortSignal }
): Promise<string> {
  const [lat, lng] = coords;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: options?.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'JakartaTransitPulse/1.0',
      },
    });

    if (res.ok) {
      const data = (await res.json()) as {
        display_name?: string;
        address?: {
          road?: string;
          suburb?: string;
          neighbourhood?: string;
          city_district?: string;
          city?: string;
        };
      };
      if (data.address) {
        const parts = [
          data.address.road,
          data.address.neighbourhood || data.address.suburb || data.address.city_district,
        ].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 2).join(',').trim();
      }
    }
  } catch {
    // Fallback on timeout or offline
  }

  return 'Lokasi Saya Saat Ini';
}

