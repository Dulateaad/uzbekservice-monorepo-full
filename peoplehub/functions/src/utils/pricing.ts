import { config } from "../config";

export function calculateTripPrice(distanceKm: number, estimatedMinutes: number) {
  const { baseFare, perKm, perMin, minFare } = config.pricing;
  const distanceFare = Math.round(distanceKm * perKm);
  const timeFare = Math.round(estimatedMinutes * perMin);
  const raw = baseFare + distanceFare + timeFare;
  const price = Math.ceil(Math.max(raw, minFare) / 50) * 50;
  return { distanceKm, estimatedMinutes, price, breakdown: { baseFare, distanceFare, timeFare } };
}
