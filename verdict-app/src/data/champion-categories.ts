import type { VerdictCard } from '@/types/card';

/** Tag on VerdictCard: `champion:${id}` */
export const CHAMPION_CATEGORY_TAG = (id: string) => `champion:${id}`;

export const CHAMPION_CATEGORY_IDS = [
  'football',
  'phones',
  'cinema',
  'gaming',
  'food',
  'cities',
] as const;

export type ChampionCategoryId = (typeof CHAMPION_CATEGORY_IDS)[number];

export function parseChampionCategory(mode: string | null | undefined): ChampionCategoryId | null {
  if (!mode || !mode.startsWith('champion:')) return null;
  const id = mode.slice('champion:'.length);
  return (CHAMPION_CATEGORY_IDS as readonly string[]).includes(id) ? (id as ChampionCategoryId) : null;
}

export function cardMatchesChampionCategory(card: { tags?: string[] }, categoryId: string): boolean {
  return card.tags?.includes(CHAMPION_CATEGORY_TAG(categoryId)) ?? false;
}

export interface ChampionFighter {
  key: string;
  displayText: string;
  image?: string;
  votes: number;
  sourceCards: VerdictCard[];
}

function normLabel(s: string): string {
  return s.trim().toLowerCase();
}

/** Суммирует голоса по всем карточкам категории: один «боец» = одно имя (нормализованное). */
export function buildChampionFightersFromCards(cards: VerdictCard[]): ChampionFighter[] {
  const map = new Map<string, { displayText: string; image?: string; votes: number; sourceCards: VerdictCard[] }>();

  const add = (label: string, votes: number, image: string | undefined, card: VerdictCard) => {
    const key = normLabel(label);
    if (!key) return;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { displayText: label.trim(), image, votes, sourceCards: [card] });
      return;
    }
    cur.votes += votes;
    if (!cur.image && image) cur.image = image;
    if (!cur.sourceCards.some(c => c.id === card.id)) cur.sourceCards.push(card);
  };

  for (const c of cards) {
    add(c.optionA, c.votesA, c.imageA, c);
    add(c.optionB, c.votesB, c.imageB, c);
  }

  return [...map.values()]
    .map(v => ({
      key: normLabel(v.displayText),
      displayText: v.displayText,
      image: v.image,
      votes: v.votes,
      sourceCards: v.sourceCards,
    }))
    .sort((a, b) => b.votes - a.votes || a.displayText.localeCompare(b.displayText, 'ru'));
}

export function findCardVoteForDuel(
  top: ChampionFighter,
  bottom: ChampionFighter,
  choice: 'A' | 'B',
  poolCards: VerdictCard[],
): { cardId: string; choice: 'A' | 'B' } | null {
  const t = top.key;
  const b = bottom.key;
  const wantWinner = choice === 'A' ? t : b;

  for (const c of poolCards) {
    const a = normLabel(c.optionA);
    const btm = normLabel(c.optionB);
    if (a === t && btm === b) return { cardId: c.id, choice };
    if (a === b && btm === t) return { cardId: c.id, choice: choice === 'A' ? 'B' : 'A' };
  }

  for (const c of [...top.sourceCards, ...bottom.sourceCards]) {
    if (normLabel(c.optionA) === wantWinner) return { cardId: c.id, choice: 'A' };
    if (normLabel(c.optionB) === wantWinner) return { cardId: c.id, choice: 'B' };
  }

  for (const c of poolCards) {
    if (normLabel(c.optionA) === wantWinner) return { cardId: c.id, choice: 'A' };
    if (normLabel(c.optionB) === wantWinner) return { cardId: c.id, choice: 'B' };
  }

  return null;
}
