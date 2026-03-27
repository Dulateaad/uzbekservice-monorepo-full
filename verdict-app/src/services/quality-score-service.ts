/**
 * AI-подобная модерация — оценка качества карточки (0–1).
 * Эвристики: длина, разнообразие, запрещённый контент.
 * Карточки с score < 0.3 идут в модерацию (pending).
 */

import { isContentForbidden } from '@/data/forbidden-content';

const MIN_OPTION_LEN = 2;
const MAX_OPTION_LEN = 100;
const IDEAL_MIN_LEN = 3;
const IDEAL_MAX_LEN = 50;

export function computeQualityScore(optionA: string, optionB: string): number {
  const a = optionA.trim();
  const b = optionB.trim();

  if (isContentForbidden(a) || isContentForbidden(b)) return 0;

  if (a.length < MIN_OPTION_LEN || b.length < MIN_OPTION_LEN) return 0;
  if (a.length > MAX_OPTION_LEN || b.length > MAX_OPTION_LEN) return 0.2;

  if (a.toLowerCase() === b.toLowerCase()) return 0;

  let score = 0.5;

  const lenScore = () => {
    const avgLen = (a.length + b.length) / 2;
    if (avgLen >= IDEAL_MIN_LEN && avgLen <= IDEAL_MAX_LEN) return 0.2;
    if (avgLen >= MIN_OPTION_LEN && avgLen <= MAX_OPTION_LEN) return 0.1;
    return 0;
  };
  score += lenScore();

  const diversityScore = () => {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
    const total = wordsA.size + wordsB.size;
    if (total === 0) return 0.1;
    const overlapRatio = overlap / Math.min(wordsA.size, wordsB.size) || 0;
    return overlapRatio < 0.5 ? 0.2 : overlapRatio < 0.8 ? 0.1 : 0;
  };
  score += diversityScore();

  const balanceScore = () => {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return ratio >= 0.3 ? 0.1 : 0;
  };
  score += balanceScore();

  return Math.min(1, Math.round(score * 100) / 100);
}

export const QUALITY_THRESHOLD_PUBLISH = 0.3;
