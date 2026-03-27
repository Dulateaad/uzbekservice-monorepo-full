import type { VerdictCard } from '@/types/card';

const HIT_THRESHOLD = 10_000;

export type ReputationLevel =
  | 'novice'
  | 'author'
  | 'popular'
  | 'hitmaker'
  | 'legend'
  | 'viral';

export interface ReputationInfo {
  level: ReputationLevel;
  label: string;
  emoji: string;
  totalVotes: number;
}

const LEVELS: Record<ReputationLevel, { minVotes: number; label: string; emoji: string }> = {
  novice: { minVotes: 0, label: 'Новичок', emoji: '🌱' },
  author: { minVotes: 1, label: 'Автор', emoji: '⭐' },
  popular: { minVotes: 100, label: 'Популярный', emoji: '🔥' },
  hitmaker: { minVotes: 1000, label: 'Хитмейкер', emoji: '💎' },
  legend: { minVotes: 10000, label: 'Легенда', emoji: '👑' },
  viral: { minVotes: 1000000, label: 'Создатель вирусного', emoji: '🌍' },
};

export function getReputation(peopleCards: VerdictCard[]): ReputationInfo {
  const totalVotes = peopleCards.reduce((s, c) => s + c.votesA + c.votesB, 0);
  const hitCount = peopleCards.filter((c) => (c.votesA + c.votesB) >= HIT_THRESHOLD).length;

  let level: ReputationLevel = 'novice';
  if (peopleCards.length >= 1) level = 'author';
  if (totalVotes >= 100) level = 'popular';
  if (hitCount >= 1) level = 'hitmaker';
  if (hitCount >= 5) level = 'legend';
  if (totalVotes >= 1_000_000) level = 'viral';

  const info = LEVELS[level];
  return {
    level,
    label: info.label,
    emoji: info.emoji,
    totalVotes,
  };
}
