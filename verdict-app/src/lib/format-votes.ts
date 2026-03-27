import type { Locale } from '@/i18n/translations';

export function formatVoteCount(n: number, locale: Locale): string {
  const loc = locale === 'zh' ? 'zh-CN' : locale === 'ru' ? 'ru-RU' : 'en-US';
  const formatted = n.toLocaleString(loc);

  if (locale === 'ru') {
    const abs100 = n % 100;
    const last = n % 10;
    if (abs100 >= 11 && abs100 <= 14) return `${formatted} голосов`;
    if (last === 1) return `${formatted} голос`;
    if (last >= 2 && last <= 4) return `${formatted} голоса`;
    return `${formatted} голосов`;
  }

  if (locale === 'zh') {
    return `${formatted} 票`;
  }

  return n === 1 ? `${formatted} vote` : `${formatted} votes`;
}
