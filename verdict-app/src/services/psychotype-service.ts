import type { UserVote } from './votes-service';
import type { VerdictCard } from '@/types/card';

export type PsychotypeDimension =
  | 'risk'
  | 'logic'
  | 'freedom'
  | 'emotions'
  | 'social';

export interface PsychotypeResult {
  dimensions: Record<PsychotypeDimension, { label: string; value: number }>;
  summary: string;
}

function inferDimensionFromCard(card: VerdictCard): PsychotypeDimension | null {
  const text = `${card.optionA} ${card.optionB}`.toLowerCase();
  if (text.includes('риск') || text.includes('безопасн') || text.includes('risk') || text.includes('safe')) return 'risk';
  if (text.includes('логик') || text.includes('интуиц') || text.includes('logic') || text.includes('intuition')) return 'logic';
  if (text.includes('свобод') || text.includes('стабильн') || text.includes('freedom') || text.includes('stability')) return 'freedom';
  if (text.includes('эмоц') || text.includes('расчёт') || text.includes('emotion') || text.includes('calculation')) return 'emotions';
  if (text.includes('обществ') || text.includes('одиноч') || text.includes('social') || text.includes('alone')) return 'social';
  return null;
}

export function computePsychotype(
  votes: UserVote[],
  cardsMap: Map<string, VerdictCard>
): PsychotypeResult | null {
  if (votes.length < 20) return null;

  const dimScores: Record<PsychotypeDimension, number[]> = {
    risk: [],
    logic: [],
    freedom: [],
    emotions: [],
    social: [],
  };

  for (const v of votes) {
    const card = cardsMap.get(v.cardId);
    if (!card) continue;
    const dim = inferDimensionFromCard(card);
    if (!dim) continue;
    const score = v.choice === 'A' ? 1 : -1;
    dimScores[dim].push(score);
  }

  const dimensions: Record<PsychotypeDimension, { label: string; value: number }> = {
    risk: { label: 'Риск vs Безопасность', value: 0 },
    logic: { label: 'Логика vs Интуиция', value: 0 },
    freedom: { label: 'Свобода vs Стабильность', value: 0 },
    emotions: { label: 'Эмоции vs Расчёт', value: 0 },
    social: { label: 'Социальность vs Одиночество', value: 0 },
  };

  for (const [dim, scores] of Object.entries(dimScores) as [PsychotypeDimension, number[]][]) {
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      dimensions[dim].value = Math.round(Math.max(-100, Math.min(100, avg * 50)));
    }
  }

  const parts: string[] = [];
  if (dimensions.risk.value > 10) parts.push('риск');
  else if (dimensions.risk.value < -10) parts.push('безопасность');
  if (dimensions.logic.value > 10) parts.push('логика');
  else if (dimensions.logic.value < -10) parts.push('интуиция');
  if (parts.length === 0) parts.push('сбалансированный');

  return {
    dimensions,
    summary: parts.join(', '),
  };
}
