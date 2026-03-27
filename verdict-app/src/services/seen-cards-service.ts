/**
 * NO REPEAT — просмотренные карточки не возвращаются.
 * Каждый подраздел — своя история просмотров.
 * Храним в localStorage (до 5000 ID на подраздел).
 */

const STORAGE_PREFIX = 'verdict_seen_';
const MAX_SEEN_PER_SUBSECTION = 5000;

function getStorageKey(subsection: string): string {
  return `${STORAGE_PREFIX}${subsection}`;
}

export function getSeenCardIds(subsection: string): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey(subsection));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markCardAsSeen(subsection: string, cardId: string): void {
  try {
    const seen = getSeenCardIds(subsection);
    seen.add(cardId);
    const arr = Array.from(seen);
    if (arr.length > MAX_SEEN_PER_SUBSECTION) {
      arr.splice(0, arr.length - MAX_SEEN_PER_SUBSECTION);
    }
    localStorage.setItem(getStorageKey(subsection), JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export function filterSeenCards<T extends { id: string }>(
  subsection: string,
  cards: T[]
): T[] {
  const seen = getSeenCardIds(subsection);
  return cards.filter((c) => !seen.has(c.id));
}
