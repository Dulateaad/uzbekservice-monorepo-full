/**
 * Streak — серия выборов.
 * Сбрасывается если не заходил 24 часа.
 * Milestone: 10, 25, 50, 100, и каждые 25.
 */

const STORAGE_KEY = 'verdict_streak';
const STREAK_TTL_MS = 24 * 60 * 60 * 1000;

export interface StreakData {
  streak: number;
  lastVoteAt: number;
}

export function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { streak: 0, lastVoteAt: 0 };
    const data = JSON.parse(raw) as StreakData;
    const now = Date.now();
    if (data.lastVoteAt && now - data.lastVoteAt > STREAK_TTL_MS) {
      return { streak: 0, lastVoteAt: 0 };
    }
    return { streak: data.streak ?? 0, lastVoteAt: data.lastVoteAt ?? 0 };
  } catch {
    return { streak: 0, lastVoteAt: 0 };
  }
}

export function saveStreak(streak: number): void {
  try {
    const data: StreakData = { streak, lastVoteAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function isStreakMilestone(streak: number): boolean {
  return streak > 0 && (streak === 10 || streak === 25 || streak === 50 || streak === 100 || streak % 25 === 0);
}
