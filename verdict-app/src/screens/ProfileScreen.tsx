import { useState, useEffect } from 'react';
import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { PremiumScreen } from '@/screens/PremiumScreen';
import { getCardsByAuthor, getCardById, getBattleOfDayCard } from '@/services/cards-service';
import { getUserVotes, getUserVoteCount } from '@/services/votes-service';
import { computePsychotype, type PsychotypeResult } from '@/services/psychotype-service';
import { loadStreak } from '@/services/streak-service';
import type { VerdictCard } from '@/types/card';
import type { Locale } from '@/i18n/translations';

/* ── status thresholds ── */
function getUserStatus(voteCount: number, cardsCreated: number) {
  if (voteCount >= 10_000 || cardsCreated >= 50) return { label: 'Легенда', emoji: '👑', next: null, progress: 1 };
  if (voteCount >= 5_000 || cardsCreated >= 20) return { label: 'Популярный', emoji: '⭐', next: 'Легенда', progress: Math.min(1, voteCount / 10_000) };
  if (voteCount >= 1_000 || cardsCreated >= 5) return { label: 'Автор', emoji: '✍️', next: 'Популярный', progress: Math.min(1, voteCount / 5_000) };
  if (voteCount >= 100) return { label: 'Активный', emoji: '⚡', next: 'Автор', progress: Math.min(1, voteCount / 1_000) };
  return { label: 'Новичок', emoji: '🌱', next: 'Активный', progress: Math.min(1, voteCount / 100) };
}

interface ForYouCard {
  emoji: string;
  title: string;
  subtitle: string;
  action: string;
  onClick?: () => void;
}

export function ProfileScreen({ onOpenOnboarding, onBack }: { onOpenOnboarding?: () => void; onBack?: () => void }) {
  const { t, locale, setLocale } = useLocale();
  const [showPremium, setShowPremium] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, savedCardIds, askPeopleCountThisMonth, canAskPeople, isOnboarded } = useUser();

  const [myCards, setMyCards] = useState<VerdictCard[]>([]);
  const [_savedCards, setSavedCards] = useState<VerdictCard[]>([]);
  const [voteCount, setVoteCount] = useState(0);
  const [psychotype, setPsychotype] = useState<PsychotypeResult | null>(null);
  const [battleOfDay, setBattleOfDay] = useState<VerdictCard | null>(null);
  const [historyVotes, setHistoryVotes] = useState<{ cardId: string; choice: string; createdAt: number }[]>([]);
  const [firstVoteDate, setFirstVoteDate] = useState<number | null>(null);
  const [cardsExpanded, setCardsExpanded] = useState(false);

  const streak = loadStreak().streak;

  useEffect(() => {
    const uid = user?.userId;
    if (uid) getCardsByAuthor(uid).then(setMyCards).catch(() => {});
  }, [user?.userId]);

  useEffect(() => {
    if (savedCardIds.length === 0) { setSavedCards([]); return; }
    Promise.all(savedCardIds.map((id) => getCardById(id)))
      .then((c) => c.filter((x): x is VerdictCard => x !== null))
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
      setPsychotype(computePsychotype(votes, map));
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      setHistoryVotes(votes.filter((v) => v.createdAt < thirtyDaysAgo).slice(0, 20));
      setFirstVoteDate(votes.length > 0 ? Math.min(...votes.map((v) => v.createdAt)) : null);
    })();
  }, [user?.userId]);

  useEffect(() => {
    getBattleOfDayCard().then(setBattleOfDay).catch(() => {});
  }, []);

  const displayName = user?.firstName
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : user?.username || 'User';

  const status = getUserStatus(voteCount, myCards.length);
  const daysOnPlatform = firstVoteDate ? Math.floor((Date.now() - firstVoteDate) / (24 * 60 * 60 * 1000)) : 0;
  const votesOnMyCards = myCards.reduce((s, c) => s + c.votesA + c.votesB, 0);
  const trendingCard = myCards.find(c => (c.votesA + c.votesB) > 100);

  /* ── for you now (max 3) ── */
  const forYouCards: ForYouCard[] = [];
  if (battleOfDay) {
    const bv = battleOfDay.votesA + battleOfDay.votesB;
    forYouCards.push({
      emoji: '⚔️',
      title: 'Битва дня ждёт тебя',
      subtitle: `${bv > 1000 ? Math.round(bv / 1000) + 'К' : bv} голосов. Спор горячий.`,
      action: 'Проголосовать сейчас',
    });
  }
  if (trendingCard) {
    forYouCards.push({
      emoji: '🚀',
      title: 'Твоя карточка взлетает',
      subtitle: `${trendingCard.optionA} vs ${trendingCard.optionB} — набирает голоса`,
      action: 'Следить за карточкой',
    });
  }
  if (streak > 0 && streak % 7 === 0) {
    forYouCards.push({
      emoji: '🔥',
      title: `Серия ${streak} дней!`,
      subtitle: 'Не останавливайся — продолжай голосовать',
      action: 'В поток',
    });
  }
  if (forYouCards.length === 0) {
    forYouCards.push({
      emoji: '🃏',
      title: 'Начни голосовать',
      subtitle: 'Открой поток карточек и выбирай',
      action: 'Открыть поток',
    });
  }

  const statusLabel = (s?: VerdictCard['status']) => {
    if (s === 'pending') return '⏳ На модерации';
    if (s === 'rejected') return '❌ Отклонена';
    if (s === 'hit') return '🔥 Хит';
    return '✅ Опубликована';
  };

  if (showPremium) return <PremiumScreen onBack={() => setShowPremium(false)} />;

  if (showSettings) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] pb-[env(safe-area-inset-bottom)]">
        <div className="px-4 py-3 border-b border-[var(--app-border)] flex items-center gap-3">
          <button onClick={() => { hapticFeedback('light'); setShowSettings(false); }} className="text-sm text-[var(--app-text-muted)]">← Назад</button>
          <span className="font-semibold">⚙️ Настройки</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
            <h3 className="font-medium mb-2">{t.language}</h3>
            <div className="flex gap-2">
              {(['en', 'ru', 'zh'] as Locale[]).map((l) => (
                <button key={l} onClick={() => { setLocale(l); hapticFeedback('light'); }}
                  className={`px-3 py-1.5 rounded-lg text-sm ${locale === l ? 'bg-[var(--app-accent)] text-white' : 'bg-[var(--app-tab-active)] text-[var(--app-text-muted)]'}`}
                >{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <button onClick={() => { toggleTheme(); hapticFeedback('light'); }}
            className="w-full p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-left flex items-center gap-3">
            <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
            <span>{theme === 'dark' ? t.themeDark : t.themeLight}</span>
          </button>
          <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
            <h3 className="font-medium mb-1">🔔 Уведомления</h3>
            <p className="text-sm text-[var(--app-text-muted)]">Битва дня, результаты, твои карточки — включи в настройках Telegram</p>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
            <p className="text-sm text-[var(--app-text-muted)]">🔒 Приватность — в разработке</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] pb-[env(safe-area-inset-bottom)] overflow-y-auto">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 bg-[var(--app-bg)]/95 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between border-b border-[var(--app-border)]">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={() => { hapticFeedback('light'); onBack(); }} className="text-sm text-[var(--app-text-muted)] active:opacity-70">←</button>
          )}
          <span className="font-semibold text-[15px]">Мой профиль</span>
        </div>
        <button onClick={() => { hapticFeedback('light'); setShowSettings(true); }} className="text-lg active:opacity-70">⚙️</button>
      </div>

      <div className="p-4 space-y-4">
        {/* ── BLOCK 1: Profile header ── */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--app-bg-secondary)] flex items-center justify-center overflow-hidden border-2 border-[var(--app-border)] shrink-0">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{displayName}</h1>
            {user?.country && (
              <p className="text-sm text-[var(--app-text-muted)]">
                🌍 {user.city ? `${user.city}, ` : ''}{user.country}
              </p>
            )}
            {user?.isPremium && (
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">💎 Premium</span>
            )}
          </div>
        </div>

        {/* ── BLOCK 2: My Activity ── */}
        <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">🔥 Серия</span>
            <span className="font-bold text-[var(--app-accent)]">{streak} дн.</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">⚡ Голосов всего</span>
            <span className="font-bold">{voteCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">🃏 Карточек создано</span>
            <span className="font-bold">{myCards.length}</span>
          </div>
          {votesOnMyCards > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm">👥 Голосов на мои</span>
              <span className="font-bold">{votesOnMyCards.toLocaleString()}</span>
            </div>
          )}
          <div className="pt-2 border-t border-[var(--app-border)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">{status.emoji} {status.label}</span>
              {status.next && <span className="text-[11px] text-[var(--app-text-muted)]">→ {status.next}</span>}
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--app-border)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--app-accent)] transition-all" style={{ width: `${Math.round(status.progress * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* ── BLOCK 3: For You Now ── */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">🎯 Для тебя сейчас</h2>
          <div className="space-y-2">
            {forYouCards.slice(0, 3).map((c, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl shrink-0">{c.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{c.title}</p>
                    <p className="text-xs text-[var(--app-text-muted)] mt-0.5">{c.subtitle}</p>
                    <button className="mt-1.5 text-xs font-medium text-[var(--app-accent)]">▶ {c.action}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BLOCK 4: My Tools ── */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">🛠️ Мои инструменты</h2>
          <div className="space-y-2">
            <ToolCard emoji="🤝" title="Поспорь с другом" desc="Не можете договориться? Пусть народ решит." action="Создать спор" />
            <ToolCard emoji="🔍" title="Найди товар" desc="Не реклама. Мнение миллионов покупателей." action="Открыть поиск" />
            <ToolCard emoji="🕵️" title="Спроси народ анонимно" desc={canAskPeople ? `Использовано ${askPeopleCountThisMonth}/3 в этом месяце` : 'Premium — без ограничений'} action="Задать вопрос" />
            <ToolCard emoji="✨" title="Создать карточку" desc="Опиши идею текстом. Твои слова — твоя карточка." action="Создать" />
            {user?.country && (
              <ToolCard emoji="🌍" title={`Что думает ${user.city || user.country}?`} desc="Посмотри как голосуют люди рядом" action="Открыть локальные" />
            )}
          </div>
        </div>

        {/* ── BLOCK 5: My Profile / Psychotype ── */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">🧠 Мой профиль</h2>

          {psychotype && voteCount >= 20 ? (
            <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] mb-2">
              <h3 className="font-medium mb-3 text-sm">🧠 Мой психотип</h3>
              <div className="space-y-2.5">
                {Object.entries(psychotype.dimensions).map(([key, dim]) => {
                  const pct = 50 + dim.value / 2;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs text-[var(--app-text-muted)] mb-0.5">
                        <span>{dim.label.split(' vs ')[0]}</span>
                        <span>{dim.label.split(' vs ')[1]}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--app-border)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--app-accent)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--app-text-muted)] mt-3 italic">«{psychotype.summary}»</p>
              {!user?.isPremium && (
                <button onClick={() => { hapticFeedback('light'); setShowPremium(true); }}
                  className="mt-2 text-xs text-[var(--app-accent)] font-medium">Полный анализ — Premium →</button>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] mb-2">
              <p className="text-sm text-[var(--app-text-muted)]">🧠 Проголосуй {20 - voteCount > 0 ? `ещё ${20 - voteCount}` : '20+'} карточек → увидишь свой психотип</p>
            </div>
          )}

          {daysOnPlatform >= 30 && historyVotes.length > 0 && (
            <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] mb-2">
              <h3 className="font-medium text-sm mb-1">📈 Динамика</h3>
              <p className="text-xs text-[var(--app-text-muted)]">3 месяца назад ты выбирал иначе</p>
              {user?.isPremium ? (
                <button className="mt-1.5 text-xs text-[var(--app-accent)] font-medium">Посмотреть как изменился →</button>
              ) : (
                <button onClick={() => { hapticFeedback('light'); setShowPremium(true); }}
                  className="mt-1.5 text-xs text-[var(--app-accent)] font-medium">Premium →</button>
              )}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] mb-2">
            <h3 className="font-medium text-sm mb-1">📅 Моя история</h3>
            <p className="text-xs text-[var(--app-text-muted)]">
              {daysOnPlatform >= 30
                ? 'Хронология твоих выборов'
                : `Откроется через ${30 - daysOnPlatform} дней`}
            </p>
          </div>

          {/* My Cards */}
          <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
            <button onClick={() => setCardsExpanded(!cardsExpanded)} className="w-full flex items-center justify-between">
              <h3 className="font-medium text-sm">🃏 Мои карточки ({myCards.length})</h3>
              <span className="text-[var(--app-text-muted)] text-xs">{cardsExpanded ? '▲' : '▼'}</span>
            </button>
            {cardsExpanded && (
              <div className="mt-3 space-y-2">
                {myCards.length === 0 ? (
                  <p className="text-xs text-[var(--app-text-muted)] text-center py-2">Пока нет карточек</p>
                ) : (
                  myCards.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{c.optionA} vs {c.optionB}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-[var(--app-text-muted)]">{(c.votesA + c.votesB).toLocaleString()}</span>
                        <span className="text-[10px]">{statusLabel(c.status)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── BLOCK 6: Premium ── */}
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">💎 Premium</h2>
          {user?.isPremium ? (
            <p className="text-sm text-[var(--app-accent)]">Активирован ✓</p>
          ) : (
            <>
              <div className="space-y-1.5 mb-3">
                {[
                  '🌆 Статистика твоего города',
                  '📊 Разбивка по полу и возрасту',
                  '🕵️ Unlimited анонимных вопросов',
                  '✨ Создать карточку своей мечты',
                  '🧠 Полный психологический анализ',
                  '🃏 Unlimited создание карточек',
                ].map((f) => (
                  <p key={f} className="text-xs text-[var(--app-text)]">{f}</p>
                ))}
              </div>
              <button onClick={() => { hapticFeedback('light'); setShowPremium(true); }}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-medium text-sm">
                Попробовать Premium
              </button>
              <p className="text-center text-[10px] text-[var(--app-text-muted)] mt-1.5">$2-3/мес · Отмена в любой момент</p>
            </>
          )}
        </div>

        {/* Onboarding nudge */}
        {!isOnboarded && onOpenOnboarding && (
          <button onClick={() => { hapticFeedback('light'); onOpenOnboarding(); }}
            className="w-full py-3 rounded-xl bg-[var(--app-accent)] text-white font-medium">
            {t.onboardingTitle}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Tool card sub-component ── */
function ToolCard({ emoji, title, desc, action }: { emoji: string; title: string; desc: string; action: string; onClick?: () => void }) {
  return (
    <div className="p-3.5 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]">
      <div className="flex items-start gap-2.5">
        <span className="text-xl shrink-0">{emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-[var(--app-text-muted)] mt-0.5">{desc}</p>
          <button className="mt-1.5 text-xs font-medium text-[var(--app-accent)]">▶ {action}</button>
        </div>
      </div>
    </div>
  );
}
