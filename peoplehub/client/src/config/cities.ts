export interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  // Города республиканского значения
  { id: 'almaty', name: 'Алматы', lat: 43.238949, lng: 76.945465 },
  { id: 'astana', name: 'Астана', lat: 51.1694, lng: 71.4491 },
  { id: 'shymkent', name: 'Шымкент', lat: 42.3417, lng: 69.5901 },
  // Областные центры
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
  { id: 'turkestan', name: 'Туркестан', lat: 43.3017, lng: 68.2514 },
  { id: 'taldykorgan', name: 'Талдыкорган', lat: 45.0167, lng: 78.3833 },
  { id: 'kokshetau', name: 'Кокшетау', lat: 53.2833, lng: 69.3833 },
  { id: 'zhezkazgan', name: 'Жезказган', lat: 47.7833, lng: 67.7 },
  { id: 'konayev', name: 'Конаев', lat: 43.3567, lng: 77.0042 },
  // Крупные города
  { id: 'temirtau', name: 'Темиртау', lat: 50.0547, lng: 72.9644 },
  { id: 'ekibastuz', name: 'Экибастуз', lat: 51.7231, lng: 75.3228 },
  { id: 'rudny', name: 'Рудный', lat: 52.9667, lng: 63.1167 },
  { id: 'zhanaozen', name: 'Жанаозен', lat: 43.3444, lng: 52.8528 },
  { id: 'balkhash', name: 'Балхаш', lat: 46.8481, lng: 74.9514 },
  { id: 'kentau', name: 'Кентау', lat: 43.5167, lng: 68.5 },
  { id: 'satpayev', name: 'Сатпаев', lat: 47.9, lng: 67.5333 },
  { id: 'kulsary', name: 'Кульсары', lat: 46.9556, lng: 54.0139 },
  { id: 'ridder', name: 'Риддер', lat: 50.35, lng: 83.5167 },
  { id: 'zharkent', name: 'Жаркент', lat: 44.1667, lng: 80.0 },
  { id: 'saran', name: 'Сарань', lat: 49.8, lng: 72.85 },
  { id: 'shakhtinsk', name: 'Шахтинск', lat: 49.7167, lng: 72.5833 },
  { id: 'lisakovsk', name: 'Лисаковск', lat: 52.5417, lng: 62.5 },
  { id: 'arkalyk', name: 'Аркалык', lat: 50.25, lng: 66.9167 },
  { id: 'stepnogorsk', name: 'Степногорск', lat: 52.35, lng: 71.8833 },
  { id: 'aksay', name: 'Аксай', lat: 51.1667, lng: 53.0333 },
  { id: 'shu', name: 'Шу', lat: 43.6, lng: 73.75 },
  { id: 'aral', name: 'Аральск', lat: 46.7917, lng: 61.6667 },
  { id: 'kapchagay', name: 'Капшагай', lat: 43.8833, lng: 77.0667 },
  { id: 'talgar', name: 'Талгар', lat: 43.3, lng: 77.2333 },
  { id: 'kaskelen', name: 'Каскелен', lat: 43.2, lng: 76.6167 },
  { id: 'issyk', name: 'Есік', lat: 43.35, lng: 77.45 },
  { id: 'otegen_batyr', name: 'Отеген Батыр', lat: 43.3333, lng: 77.05 },
  { id: 'saryagash', name: 'Сарыагаш', lat: 41.4667, lng: 69.1667 },
  { id: 'aksу', name: 'Аксу', lat: 52.0333, lng: 76.9333 },
  { id: 'baykonyr', name: 'Байконыр', lat: 45.6167, lng: 63.3167 },
  { id: 'ayagoz', name: 'Аягоз', lat: 47.9667, lng: 80.4333 },
  { id: 'ushtobe', name: 'Уштобе', lat: 45.2333, lng: 77.9667 },
  { id: 'tekeli', name: 'Текели', lat: 44.8667, lng: 78.7667 },
  { id: 'kandyagash', name: 'Кандыагаш', lat: 49.4667, lng: 57.4333 },
  { id: 'chromtau', name: 'Хромтау', lat: 50.2667, lng: 58.4333 },
  { id: 'fort_shevchenko', name: 'Форт-Шевченко', lat: 44.5167, lng: 50.2667 },
  { id: 'karatau', name: 'Каратау', lat: 43.1833, lng: 70.4667 },
  { id: 'lenger', name: 'Ленгер', lat: 42.1833, lng: 69.8833 },
  { id: 'arys', name: 'Арысь', lat: 42.4333, lng: 68.8 },
  { id: 'irgiz', name: 'Иргиз', lat: 48.6167, lng: 61.2667 },
  { id: 'abay', name: 'Абай', lat: 49.6333, lng: 72.85 },
  { id: 'zyryanovsk', name: 'Алтай', lat: 49.7333, lng: 84.25 },
  { id: 'shemonaikha', name: 'Шемонаиха', lat: 50.6333, lng: 81.9 },
  { id: 'bulaevo', name: 'Булаево', lat: 54.9, lng: 70.45 },
  { id: 'makinsk', name: 'Макинск', lat: 52.6333, lng: 70.4167 },
  { id: 'schuchinsk', name: 'Щучинск', lat: 52.9333, lng: 70.2 },
  { id: 'esil', name: 'Есиль', lat: 51.95, lng: 66.3833 },
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
