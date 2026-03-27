/**
 * Premium — экран подписки.
 * Telegram is_premium — встроенная подписка. Для покупки — внешняя ссылка.
 */

import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';
import { useUser } from '@/context/UserContext';

interface PremiumScreenProps {
  onBack: () => void;
}

const PREMIUM_LINK = 'https://t.me/premium';

export function PremiumScreen({ onBack }: PremiumScreenProps) {
  const { t } = useLocale();
  const { user } = useUser();

  if (user?.isPremium) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] p-6">
        <button
          onClick={() => {
            hapticFeedback('light');
            onBack();
          }}
          className="text-[var(--app-text-muted)] text-sm mb-6"
        >
          ← {t.back}
        </button>
        <div className="text-center py-12">
          <span className="text-6xl block mb-4">👑</span>
          <h1 className="text-2xl font-bold mb-2">Premium активен</h1>
          <p className="text-[var(--app-text-muted)]">У тебя есть все преимущества</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] p-6">
      <button
        onClick={() => {
          hapticFeedback('light');
          onBack();
        }}
        className="text-[var(--app-text-muted)] text-sm mb-6"
      >
        ← {t.back}
      </button>
      <div className="text-center mb-8">
        <span className="text-6xl block mb-4">💎</span>
        <h1 className="text-2xl font-bold mb-2">{t.premiumTitle}</h1>
        <p className="text-[var(--app-text-muted)]">{t.premiumDesc}</p>
      </div>
      <ul className="space-y-3 mb-8 text-left">
        <li className="flex items-center gap-2">
          <span>🌍</span>
          <span>Разбивка по странам, полу, возрасту</span>
        </li>
        <li className="flex items-center gap-2">
          <span>🕵️</span>
          <span>Безлимит вопросов в «Спроси народ»</span>
        </li>
        <li className="flex items-center gap-2">
          <span>🧠</span>
          <span>Полный психологический профиль</span>
        </li>
        <li className="flex items-center gap-2">
          <span>🃏</span>
          <span>Безлимит создания карточек</span>
        </li>
      </ul>
      <a
        href={PREMIUM_LINK}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => hapticFeedback('medium')}
        className="block w-full py-4 rounded-xl bg-[var(--app-accent)] text-white font-bold text-center"
      >
        {t.upgradeToPremium}
      </a>
    </div>
  );
}
