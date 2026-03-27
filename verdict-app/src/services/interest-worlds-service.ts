/**
 * Interest Worlds — миры интересов для персонализации.
 * Категории маппятся на миры, система определяет интересы по голосам.
 */

export const INTEREST_WORLDS: Record<string, { emoji: string; label: string; categories: string[] }> = {
  football: { emoji: '⚽', label: 'Футбол', categories: ['popular'] },
  tech: { emoji: '📱', label: 'Технологии', categories: ['popular', 'gaming'] },
  food: { emoji: '🍔', label: 'Еда', categories: ['popular', 'fast'] },
  gaming: { emoji: '🎮', label: 'Игры', categories: ['gaming'] },
  philosophy: { emoji: '🧠', label: 'Философия', categories: ['philosophy', 'paradox'] },
  lifestyle: { emoji: '🌍', label: 'Образ жизни', categories: ['lifestyle', 'love', 'family', 'character', 'money'] },
};

const WORLD_BY_CATEGORY: Record<string, string> = {};
for (const [worldId, data] of Object.entries(INTEREST_WORLDS)) {
  for (const cat of data.categories) {
    if (!WORLD_BY_CATEGORY[cat]) WORLD_BY_CATEGORY[cat] = worldId;
  }
}

export function getWorldForCategory(category: string): string | null {
  return WORLD_BY_CATEGORY[category] ?? null;
}

export function getUserInterestWeights(
  votedCategories: string[]
): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const cat of votedCategories) {
    const world = getWorldForCategory(cat);
    if (world) {
      weights[world] = (weights[world] ?? 0) + 1;
    }
  }
  return weights;
}

export function scoreCardForUser(
  cardCategory: string,
  userWeights: Record<string, number>
): number {
  const world = getWorldForCategory(cardCategory);
  if (!world) return 1;
  const weight = userWeights[world] ?? 0;
  return 1 + weight * 0.5;
}
