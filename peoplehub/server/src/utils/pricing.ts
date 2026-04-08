import { config } from '../config';

export interface PriceEstimate {
  distanceKm: number;
  estimatedMinutes: number;
  price: number;        // Итоговая цена в тенге
  breakdown: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
  };
}

/**
 * Расчёт стоимости поездки
 */
export function calculateTripPrice(
  distanceKm: number,
  estimatedMinutes: number
): PriceEstimate {
  const { baseFare, perKm, perMin, minFare } = config.pricing;

  const distanceFare = Math.round(distanceKm * perKm);
  const timeFare = Math.round(estimatedMinutes * perMin);
  const rawPrice = baseFare + distanceFare + timeFare;
  
  // Минимальная стоимость поездки
  const price = Math.max(rawPrice, minFare);
  
  // Округляем до 50 тенге
  const roundedPrice = Math.ceil(price / 50) * 50;

  return {
    distanceKm,
    estimatedMinutes,
    price: roundedPrice,
    breakdown: {
      baseFare,
      distanceFare,
      timeFare,
    },
  };
}

/**
 * Расчёт стоимости ожидания
 */
export function calculateWaitFee(waitMinutes: number): number {
  // Первые 3 минуты — бесплатно
  const billableMinutes = Math.max(0, waitMinutes - 3);
  return billableMinutes * config.pricing.waitPerMin;
}
