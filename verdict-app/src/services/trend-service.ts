/**
 * Trend Engine — статусы карточек: Сейчас спорят, Быстро растёт, Почти ничья.
 */

export type TrendStatus = 'hot' | 'rising' | 'close' | 'viral' | null;

const TREND_LABELS: Record<Exclude<TrendStatus, null>, string> = {
  hot: '🔥 Сейчас спорят',
  rising: '🚀 Быстро растёт',
  close: '⚖️ Почти ничья',
  viral: '📈 Взрывает Telegram',
};

export function getTrendLabel(status: TrendStatus): string {
  return status ? TREND_LABELS[status] : '';
}

export function computeTrendStatus(
  votesA: number,
  votesB: number,
  totalVotes: number,
  shareRate?: number
): TrendStatus {
  const total = votesA + votesB;
  if (total < 10) return null;

  const percentA = (votesA / total) * 100;
  const percentB = (votesB / total) * 100;
  const diff = Math.abs(percentA - percentB);

  if (diff < 5) return 'close';
  if (shareRate !== undefined && shareRate > 0.15) return 'viral';
  if (totalVotes >= 1000) return 'hot';
  if (totalVotes >= 100 && total >= 50) return 'rising';

  return null;
}
