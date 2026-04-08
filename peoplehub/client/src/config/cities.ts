export interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  { id: 'almaty', name: 'Алматы', lat: 43.238949, lng: 76.945465 },
  { id: 'astana', name: 'Астана', lat: 51.1694, lng: 71.4491 },
  { id: 'shymkent', name: 'Шымкент', lat: 42.3417, lng: 69.5901 },
  { id: 'karaganda', name: 'Караганда', lat: 49.8047, lng: 73.0856 },
  { id: 'aktobe', name: 'Актобе', lat: 50.2839, lng: 57.167 },
  { id: 'taraz', name: 'Тараз', lat: 42.9, lng: 71.3667 },
  { id: 'pavlodar', name: 'Павлодар', lat: 52.2873, lng: 76.9674 },
  { id: 'ust_kamenogorsk', name: 'Усть-Каменогорск', lat: 49.9481, lng: 82.6279 },
  { id: 'semey', name: 'Семей', lat: 50.4111, lng: 80.2275 },
  { id: 'atyrau', name: 'Атырау', lat: 47.0945, lng: 51.9238 },
  { id: 'kostanay', name: 'Костанай', lat: 53.2198, lng: 63.6354 },
  { id: 'kyzylorda', name: 'Кызылорда', lat: 44.8481, lng: 65.5023 },
  { id: 'oral', name: 'Уральск', lat: 51.2333, lng: 51.3667 },
  { id: 'petropavlovsk', name: 'Петропавловск', lat: 54.875, lng: 69.1833 },
  { id: 'aktau', name: 'Актау', lat: 43.65, lng: 51.15 },
  { id: 'temirtau', name: 'Темиртау', lat: 50.0547, lng: 72.9644 },
  { id: 'turkestan', name: 'Туркестан', lat: 43.3017, lng: 68.2514 },
  { id: 'taldykorgan', name: 'Талдыкорган', lat: 45.0167, lng: 78.3833 },
  { id: 'ekibastuz', name: 'Экибастуз', lat: 51.7231, lng: 75.3228 },
  { id: 'rudny', name: 'Рудный', lat: 52.9667, lng: 63.1167 },
];

export function getCityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}

export function getCityByName(name: string): City | undefined {
  return CITIES.find((c) => c.name === name);
}

export function getNearestCity(lat: number, lng: number): City {
  let best = CITIES[0];
  let bestDist = Infinity;
  for (const city of CITIES) {
    const dLat = city.lat - lat;
    const dLng = city.lng - lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) {
      bestDist = dist;
      best = city;
    }
  }
  return best;
}

export function detectCityByGPS(): Promise<City | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(getNearestCity(pos.coords.latitude, pos.coords.longitude)),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  });
}
