import type { VerdictCard } from '@/types/card';

function warmUrl(url: string, fetchPriority: 'high' | 'low') {
  if (!url) return;
  const img = new Image();
  try {
    if ('fetchPriority' in img) (img as HTMLImageElement).fetchPriority = fetchPriority;
  } catch {
    /* Safari старых версий */
  }
  img.decoding = 'async';
  img.src = url;
}

/** Прогрев кэша браузера для обеих половинок карточки */
export function prefetchCardImages(card: VerdictCard | null, fetchPriority: 'high' | 'low' = 'low') {
  if (!card) return;
  if (card.imageA) warmUrl(card.imageA, fetchPriority);
  if (card.imageB) warmUrl(card.imageB, fetchPriority);
}

/** Лента: ближние карточки — высокий приоритет сети, дальше — низкий */
export function prefetchFeedImageHorizon(cards: VerdictCard[]) {
  cards.forEach((c, i) => {
    prefetchCardImages(c, i < 3 ? 'high' : 'low');
  });
}
