/**
 * Расчёт расстояния между двумя точками по формуле Haversine
 * @returns расстояние в метрах
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Радиус Земли в метрах
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Расчёт скорости между двумя GPS точками
 * @returns скорость в км/ч
 */
export function calculateSpeed(
  lat1: number, lng1: number, time1: Date,
  lat2: number, lng2: number, time2: Date
): number {
  const distanceM = haversineDistance(lat1, lng1, lat2, lng2);
  const timeDiffMs = time2.getTime() - time1.getTime();
  if (timeDiffMs <= 0) return 0;
  
  const timeDiffH = timeDiffMs / (1000 * 60 * 60);
  const distanceKm = distanceM / 1000;
  
  return distanceKm / timeDiffH;
}

/**
 * Проверка, находится ли точка в радиусе от центра
 */
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(centerLat, centerLng, pointLat, pointLng);
  return distance <= radiusMeters;
}
