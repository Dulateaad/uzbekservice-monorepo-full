/**
 * Self-hosted Geo Services for PeopleHub
 *
 * Replaces all Mapbox paid APIs:
 *  - Geocoding (forward + reverse) -> Nominatim
 *  - Routing / Directions -> OSRM
 *  - Map tiles -> tileserver-gl (configured separately in MapView)
 *
 * NO PAID APIs. All services run via docker-compose.
 */

// Self-hosted or free public fallback
const NOMINATIM_URL = import.meta.env.VITE_NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
const OSRM_URL = import.meta.env.VITE_OSRM_URL || 'https://router.project-osrm.org';

// ==================== GEOCODING (Nominatim) ====================

export interface GeocodingResult {
  id: string;
  placeName: string;
  text: string;
  lat: number;
  lng: number;
  relevance: number;
}

/**
 * Forward geocoding: text -> coordinates
 * Uses Nominatim /search endpoint
 */
export async function geocodeForward(
  query: string,
  options?: {
    proximity?: { lat: number; lng: number };
    country?: string;
    limit?: number;
    bbox?: [number, number, number, number];
  }
): Promise<GeocodingResult[]> {
  if (query.length < 2) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: String(options?.limit ?? 5),
    'accept-language': 'ru',
  });

  if (options?.country) {
    params.set('countrycodes', options.country);
  }

  if (options?.bbox) {
    const [minLon, minLat, maxLon, maxLat] = options.bbox;
    params.set('viewbox', `${minLon},${maxLat},${maxLon},${minLat}`);
    params.set('bounded', '1');
  }

  const url = `${NOMINATIM_URL}/search?${params}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    return (data || []).map((item: any) => ({
      id: String(item.place_id),
      placeName: item.display_name,
      text: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      relevance: item.importance ?? 0.5,
    }));
  } catch (err) {
    console.error('Geocoding error:', err);
    return [];
  }
}

/**
 * Reverse geocoding: coordinates -> address
 * Uses Nominatim /reverse endpoint
 */
export async function geocodeReverse(
  lat: number,
  lng: number
): Promise<string> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
    'accept-language': 'ru',
    zoom: '18',
  });

  const url = `${NOMINATIM_URL}/reverse?${params}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data?.display_name) {
      return data.display_name;
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// ==================== ROUTING (OSRM) ====================

export interface DirectionsResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: GeoJSON.LineString;
}

/**
 * Get route between two points via OSRM
 * Returns distance, duration, and route geometry for map rendering
 */
export async function getDirections(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<DirectionsResult | null> {
  const coordinates = `${fromLng},${fromLat};${toLng},${toLat}`;
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
  });

  const url = `${OSRM_URL}/route/v1/driving/${coordinates}?${params}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return fallbackDirections(fromLat, fromLng, toLat, toLng);
    }

    const route = data.routes[0];
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMinutes: Math.ceil(route.duration / 60),
      geometry: route.geometry,
    };
  } catch (err) {
    console.error('OSRM routing error:', err);
    return fallbackDirections(fromLat, fromLng, toLat, toLng);
  }
}

/**
 * Haversine fallback when OSRM is unavailable
 */
function fallbackDirections(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): DirectionsResult {
  const R = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return {
    distanceKm: Math.round(dist * 10) / 10,
    durationMinutes: Math.ceil(dist * 3),
    geometry: {
      type: 'LineString',
      coordinates: [
        [fromLng, fromLat],
        [toLng, toLat],
      ],
    },
  };
}
