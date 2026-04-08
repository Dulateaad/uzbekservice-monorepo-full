export interface IntercityRoute {
  from: string;
  to: string;
  distanceKm: number;
  estimatedHours: number;
  recommendedPricePerSeat: number;
}

export const INTERCITY_ROUTES: IntercityRoute[] = [
  { from: 'Алматы', to: 'Астана', distanceKm: 1230, estimatedHours: 14, recommendedPricePerSeat: 8000 },
  { from: 'Алматы', to: 'Шымкент', distanceKm: 690, estimatedHours: 8, recommendedPricePerSeat: 5000 },
  { from: 'Алматы', to: 'Тараз', distanceKm: 490, estimatedHours: 5.5, recommendedPricePerSeat: 4000 },
  { from: 'Алматы', to: 'Талдыкорган', distanceKm: 275, estimatedHours: 3.5, recommendedPricePerSeat: 2500 },
  { from: 'Алматы', to: 'Караганда', distanceKm: 1060, estimatedHours: 12, recommendedPricePerSeat: 7000 },
  { from: 'Алматы', to: 'Капшагай', distanceKm: 80, estimatedHours: 1, recommendedPricePerSeat: 1500 },
  { from: 'Алматы', to: 'Туркестан', distanceKm: 790, estimatedHours: 9, recommendedPricePerSeat: 5500 },
  { from: 'Астана', to: 'Караганда', distanceKm: 215, estimatedHours: 2.5, recommendedPricePerSeat: 2000 },
  { from: 'Астана', to: 'Павлодар', distanceKm: 420, estimatedHours: 5, recommendedPricePerSeat: 3500 },
  { from: 'Астана', to: 'Костанай', distanceKm: 560, estimatedHours: 6, recommendedPricePerSeat: 4500 },
  { from: 'Астана', to: 'Петропавловск', distanceKm: 470, estimatedHours: 5, recommendedPricePerSeat: 4000 },
  { from: 'Астана', to: 'Кокшетау', distanceKm: 290, estimatedHours: 3, recommendedPricePerSeat: 2500 },
  { from: 'Астана', to: 'Темиртау', distanceKm: 200, estimatedHours: 2.5, recommendedPricePerSeat: 2000 },
  { from: 'Астана', to: 'Экибастуз', distanceKm: 310, estimatedHours: 3.5, recommendedPricePerSeat: 2500 },
  { from: 'Шымкент', to: 'Тараз', distanceKm: 200, estimatedHours: 2.5, recommendedPricePerSeat: 2000 },
  { from: 'Шымкент', to: 'Туркестан', distanceKm: 160, estimatedHours: 2, recommendedPricePerSeat: 1500 },
  { from: 'Шымкент', to: 'Кызылорда', distanceKm: 530, estimatedHours: 6, recommendedPricePerSeat: 4000 },
  { from: 'Караганда', to: 'Темиртау', distanceKm: 35, estimatedHours: 0.5, recommendedPricePerSeat: 800 },
  { from: 'Караганда', to: 'Павлодар', distanceKm: 420, estimatedHours: 5, recommendedPricePerSeat: 3500 },
  { from: 'Актобе', to: 'Уральск', distanceKm: 640, estimatedHours: 7, recommendedPricePerSeat: 5000 },
  { from: 'Актобе', to: 'Костанай', distanceKm: 600, estimatedHours: 7, recommendedPricePerSeat: 4500 },
  { from: 'Усть-Каменогорск', to: 'Семей', distanceKm: 220, estimatedHours: 3, recommendedPricePerSeat: 2000 },
  { from: 'Павлодар', to: 'Семей', distanceKm: 390, estimatedHours: 4.5, recommendedPricePerSeat: 3000 },
  { from: 'Павлодар', to: 'Экибастуз', distanceKm: 135, estimatedHours: 1.5, recommendedPricePerSeat: 1500 },
  { from: 'Атырау', to: 'Актау', distanceKm: 580, estimatedHours: 7, recommendedPricePerSeat: 5000 },
  { from: 'Костанай', to: 'Рудный', distanceKm: 50, estimatedHours: 0.7, recommendedPricePerSeat: 800 },
];

export function findRoute(from: string, to: string): IntercityRoute | undefined {
  return INTERCITY_ROUTES.find(
    (r) => (r.from === from && r.to === to) || (r.from === to && r.to === from)
  );
}

export function getRecommendedPrice(from: string, to: string): number {
  const route = findRoute(from, to);
  if (route) return route.recommendedPricePerSeat;
  return 3000;
}

export function getRouteInfo(from: string, to: string): { distanceKm: number; estimatedHours: number } {
  const route = findRoute(from, to);
  if (route) return { distanceKm: route.distanceKm, estimatedHours: route.estimatedHours };
  return { distanceKm: 300, estimatedHours: 4 };
}

export function getPopularRoutesFrom(city: string): IntercityRoute[] {
  return INTERCITY_ROUTES.filter((r) => r.from === city || r.to === city).map((r) => {
    if (r.to === city) return { ...r, from: r.to, to: r.from };
    return r;
  });
}
