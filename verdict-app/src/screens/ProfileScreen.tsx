import { useState, useEffect } from 'react';
import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { PremiumScreen } from '@/screens/PremiumScreen';
import { getCardsByAuthor, getCardById } from '@/services/cards-service';
import { getUserVotes, getUserVoteCount } from '@/services/votes-service';
import { computePsychotype } from '@/services/psychotype-service';
import { getReputation } from '@/services/reputation-service';
import type { VerdictCard } from '@/types/card';
import type { Locale } from '@/i18n/translations';

export function ProfileScreen({ onOpenOnboarding, onBack }: { onOpenOnboarding?: () => void; onBack?: () => void }) {
  const { t, locale, setLocale } = useLocale();
  const [showPremium, setShowPremium] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, savedCardIds, askPeopleCountThisMonth, canAskPeople, isOnboarded } = useUser();
  const [myCards, setMyCards] = useState<VerdictCard[]>([]);
  const [savedCards, setSavedCards] = useState<VerdictCard[]>([]);
  const [activeSection, setActiveSection] = useState<'overview' | 'myCards' | 'saved' | 'settings'>('overview');
  const [voteCount, setVoteCount] = useState(0);
  const [psychotype, setPsychotype] = useState<ReturnType<typeof computePsychotype>>(null);
  const [historyVotes, setHistoryVotes] = useState<{ cardId: string; choice: string; createdAt: number }[]>([]);
  const [firstVoteDate, setFirstVoteDate] = useState<number | null>(null);

  useEffect(() => {
    const uid = user?.userId;
    if (uid) {
      getCardsByAuthor(uid).then(setMyCards).catch(() => {});
    }
  }, [user?.userId]);

  useEffect(() => {
    if (savedCardIds.length === 0) {
      setSavedCards([]);
      return;
    }
    Promise.all(savedCardIds.map((id) => getCardById(id)))
      .then((cards) => cards.filter((c): c is VerdictCard => c !== null))
      .then(setSavedCards)
      .catch(() => {});
  }, [savedCardIds]);

  useEffect(() => {
    const uid = user?.userId;
    if (!uid) return;
    getUserVoteCount(uid).then(setVoteCount).catch(() => {});
  }, [user?.userId]);

  useEffect(() => {
    const uid = user?.userId;
    if (!uid) return;
    (async () => {
      const votes = await getUserVotes(uid);
      const map = new Map<string, VerdictCard>();
      for (const v of votes) {
        const card = await getCardById(v.cardId);
        if (card) map.set(card.id, card);
      }
      const result = computePsychotype(votes, map);
      setPsychotype(result);
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const oldVotes = votes.filter((v) => v.createdAt < thirtyDaysAgo).slice(0, 20);
      setHistoryVotes(oldVotes);
      const oldest = votes.length > 0 ? Math.min(...votes.map((v) => v.createdAt)) : null;
      setFirstVoteDate(oldest);
    })();
  }, [user?.userId]);

  const peopleCards = myCards.filter((c) => c.category === 'people');
  const reputation = getReputation(peopleCards);
  const canShowHistory = historyVotes.length > 0;
  const daysOnPlatform = firstVoteDate ? Math.floor((Date.now() - firstVoteDate) / (24 * 60 * 60 * 1000)) : 0;

  const displayName = user?.firstName
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : user?.username || 'User';

  const statusLabel = (s?: VerdictCard['status']) => {
    if (s === 'pending') return t.cardStatusPending;
    if (s === 'rejected') return t.cardStatusRejected;
    if (s === 'hit') return '🔥 ' + t.cardStatusHit;
    return t.cardStatusPublished;
  };

  if (showPremium) {
    return (
      <PremiumScreen onBack={() => setShowPremium(false)} />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] pb-[env(safe-area-inset-bottom)]">
      {onBack && (
        <div className="px-4 py-2 border-b border-[var(--app-border)]">
          <button onClick={() => { hapticFeedback('light'); onBack(); }} className="flex items-center gap-1 text-[var(--app-text-muted)] active:opacity-70 text-sm">
            <span>←</span>
            <span>{t.back}</span>
          </button>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--app-bg-secondary)] flex items-center justify-center overflow-hidden border-2 border-[var(--app-border)]">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">{displayName}</h1>
            {user?.country && (
              <p className="text-sm text-[var(--app-text-muted)]">
                {user.city ? `${user.city}, ` : ''}{user.country}
              </p>
            )}
          </div>
        </div>

        {psychotype && voteCount >= 20 && (
          <div className="mb-4 p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
            <h3 className="font-medium mb-2">📊 {t.psychotype ?? 'Психотип'}</h3>
            <p className="text-sm text-[var(--app-text-muted)]">{psychotype.summary}</p>
            {user?.isPremium && (
              <p className="text-xs text-[var(--app-accent)] mt-2">{t.psychotypeDeep ?? 'Глубокий анализ'}</p>
            )}
          </div>
        )}
        {voteCount < 20 && (
          <div className="mb-4 p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
            <p className="text-sm text-[var(--app-text-muted)]">{t.psychotypeUnlock ?? 'Проголосуй 20+ карточек, чтобы увидеть психотип'}</p>
          </div>
        )}

        {!user?.isPremium && (
          <button
            onClick={() => { hapticFeedback('light'); setShowPremium(true); }}
            className="w-full mb-4 py-3 rounded-xl border-2 border-[var(--app-accent)] text-[var(--app-accent)] font-medium flex items-center justify-center gap-2"
          >
            <span>💎</span>
            <span>{t.upgradeToPremium ?? 'Premium'}</span>
          </button>
        )}
        <div className="mb-4 p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
          <h3 className="font-medium mb-1">🏆 {t.reputation ?? 'Репутация'}</h3>
          <p className="text-lg">{reputation.emoji} {reputation.label}</p>
          <p className="text-xs text-[var(--app-text-muted)]">{reputation.totalVotes} {t.totalVotes.toLowerCase()}</p>
        </div>

        {daysOnPlatform >= 30 && canShowHistory && (
          <div className="mb-4 p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
            <h3 className="font-medium mb-2">📅 {t.myHistory ?? 'Моя история'}</h3>
            <p className="text-sm text-[var(--app-text-muted)]">{t.myHistoryDesc ?? 'Хронология твоих выборов'}</p>
          </div>
        )}
        {daysOnPlatform < 30 && (
          <div className="mb-4 p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
            <p className="text-sm text-[var(--app-text-muted)]">{t.myHistoryUnlock ?? 'Моя история откроется через 30 дней'}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-center">
            <div className="text-2xl font-bold text-[var(--app-accent)]">{myCards.length}</div>
            <div className="text-xs text-[var(--app-text-muted)]">{t.myCards}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-center">
            <div className="text-2xl font-bold text-[var(--app-accent)]">{savedCards.length}</div>
            <div className="text-xs text-[var(--app-text-muted)]">{t.savedCards}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-center col-span-2">
            <div className="text-2xl font-bold text-[var(--app-accent)]">{voteCount}</div>
            <div className="text-xs text-[var(--app-text-muted)]">{t.statsVotes ?? 'Всего голосов'}</div>
          </div>
        </div>

        {!isOnboarded && onOpenOnboarding && (
          <button
            onClick={() => { hapticFeedback('light'); onOpenOnboarding(); }}
            className="w-full mb-4 py-3 rounded-xl bg-[var(--app-accent)] text-white font-medium"
          >
            {t.onboardingTitle}
          </button>
        )}

        <div className="mb-4 p-3 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
          <p className="text-sm text-[var(--app-text-muted)]">
            {canAskPeople
              ? t.askPeopleLimit.replace('{{used}}', String(askPeopleCountThisMonth)).replace('{{limit}}', '3')
              : t.premiumUnlimited}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(['overview', 'myCards', 'saved', 'settings'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setActiveSection(s); hapticFeedback('light'); }}
              className={`py-2 px-3 rounded-xl text-sm font-medium ${
                activeSection === s ? 'bg-[var(--app-accent)] text-white' : 'bg-[var(--app-bg-secondary)] text-[var(--app-text-muted)]'
              }`}
            >
              {s === 'overview' ? t.profile : s === 'myCards' ? t.myCards : s === 'saved' ? t.savedCards : (t.settings ?? 'Настройки')}
            </button>
          ))}
        </div>

        {activeSection === 'myCards' && (
          <div className="space-y-2">
            {myCards.length === 0 ? (
              <p className="text-[var(--app-text-muted)] text-sm py-4 text-center">{t.noResults}</p>
            ) : (
              myCards.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium">{c.optionA} vs {c.optionB}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--app-tab-active)] shrink-0">
                      {statusLabel(c.status)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--app-text-muted)] mt-1">
                    {c.votesA + c.votesB} {t.totalVotes.toLowerCase()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeSection === 'saved' && (
          <div className="space-y-2">
            {savedCards.length === 0 ? (
              <p className="text-[var(--app-text-muted)] text-sm py-4 text-center">{t.noResults}</p>
            ) : (
              savedCards.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
                  <p className="font-medium">{c.optionA} vs {c.optionB}</p>
                  <p className="text-xs text-[var(--app-text-muted)] mt-1">
                    {c.votesA + c.votesB} {t.totalVotes.toLowerCase()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
              <h3 className="font-medium mb-2">{t.language}</h3>
              <div className="flex gap-2">
                {(['en', 'ru', 'zh'] as Locale[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLocale(l); hapticFeedback('light'); }}
                    className={`px-3 py-1.5 rounded-lg text-sm ${locale === l ? 'bg-[var(--app-accent)] text-white' : 'bg-[var(--app-tab-active)] text-[var(--app-text-muted)]'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => { toggleTheme(); hapticFeedback('light'); }}
              className="w-full p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-left flex items-center gap-3"
            >
              <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
              <span>{theme === 'dark' ? t.themeDark : t.themeLight}</span>
            </button>
            <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
              <p className="text-sm text-[var(--app-text-muted)]">{t.settingsPrivacy ?? 'Приватность профиля — в разработке'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
              <h3 className="font-medium mb-2">🔔 {t.settingsNotifications ?? 'Уведомления'}</h3>
              <p className="text-sm text-[var(--app-text-muted)]">Битва дня, результаты, твои карточки — включи в настройках Telegram</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
