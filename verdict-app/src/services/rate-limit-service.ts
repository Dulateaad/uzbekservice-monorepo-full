/**
 * Anti-Fraud — базовый rate limiting.
 * Максимум 60 голосов в минуту (1 в секунду в среднем).
 */

const STORAGE_KEY = 'verdict_vote_times';
const MAX_VOTES_PER_MINUTE = 60;
const WINDOW_MS = 60 * 1000;

function getVoteTimestamps(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as number[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveVoteTimestamps(timestamps: number[]): void {
  try {
    const now = Date.now();
    const filtered = timestamps.filter((t) => now - t < WINDOW_MS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

export function canVote(): boolean {
  const timestamps = getVoteTimestamps();
  const now = Date.now();
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);
  return recent.length < MAX_VOTES_PER_MINUTE;
}

export function recordVote(): void {
  const timestamps = getVoteTimestamps();
  timestamps.push(Date.now());
  saveVoteTimestamps(timestamps);
}
