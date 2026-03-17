/**
 * Правила контента — запрещённые темы карточек
 * Нельзя создавать и показывать карточки с этими темами
 */

export const FORBIDDEN_KEYWORDS = {
  alcohol: [
    'пиво', 'вино', 'водка', 'виски', 'шампанское', 'коктейли',
    'beer', 'wine', 'vodka', 'whiskey', 'champagne', 'cocktail',
    'heineken', 'corona', 'budweiser', 'jack daniels', 'johnnie walker',
  ],
  smoking: [
    'сигареты', 'вейпы', 'вейп', 'кальян', 'табак', 'наркотики',
    'cigarette', 'vape', 'hookah', 'tobacco', 'drugs',
    'marlboro', 'camel', 'philip morris',
  ],
  gambling: [
    'казино', 'ставки', 'букмекеры', 'рулетка', 'покер', 'игровые автоматы',
    'casino', 'betting', 'bookmaker', 'roulette', 'poker', 'slot',
    'bet365', '1xbet', '1xbet', 'parimatch', 'fonbet',
  ],
  adult: [
    'порно', 'порносайт', 'onlyfans', 'pornhub', 'эротик', 'секс',
    'porn', 'xxx', 'nsfw', 'adult',
  ],
} as const;

export function isContentForbidden(text: string): boolean {
  const lower = text.toLowerCase();
  const allKeywords = Object.values(FORBIDDEN_KEYWORDS).flat();
  return allKeywords.some(kw => lower.includes(kw));
}

export function validateCard(optionA: string, optionB: string): { valid: boolean; reason?: string } {
  if (isContentForbidden(optionA) || isContentForbidden(optionB)) {
    return { valid: false, reason: 'Запрещённая тема' };
  }
  return { valid: true };
}
