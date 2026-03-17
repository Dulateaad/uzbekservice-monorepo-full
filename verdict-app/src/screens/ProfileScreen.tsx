import { useState, useEffect } from 'react';
import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';
import { useUser } from '@/context/UserContext';
import { getCardsByAuthor, getCardById } from '@/services/cards-service';
import type { VerdictCard } from '@/types/card';

export function ProfileScreen({ onOpenOnboarding }: { onOpenOnboarding?: () => void }) {
  const { t } = useLocale();
  const { user, savedCardIds, askPeopleCountThisMonth, canAskPeople, isOnboarded } = useUser();
  const [myCards, setMyCards] = useState<VerdictCard[]>([]);
  const [savedCards, setSavedCards] = useState<VerdictCard[]>([]);
  const [activeSection, setActiveSection] = useState<'overview' | 'myCards' | 'saved'>('overview');

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

  const displayName = user?.firstName
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : user?.username || 'User';

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] pb-[env(safe-area-inset-bottom)]">
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

        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-center">
            <div className="text-2xl font-bold text-[var(--app-accent)]">{myCards.length}</div>
            <div className="text-xs text-[var(--app-text-muted)]">{t.myCards}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-center">
            <div className="text-2xl font-bold text-[var(--app-accent)]">{savedCards.length}</div>
            <div className="text-xs text-[var(--app-text-muted)]">{t.savedCards}</div>
          </div>
        </div>

        {!isOnboarded && onOpenOnboarding && (
          <button
            onClick={() => {
              hapticFeedback('light');
              onOpenOnboarding();
            }}
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

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setActiveSection('overview');
              hapticFeedback('light');
            }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
              activeSection === 'overview' ? 'bg-[var(--app-accent)] text-white' : 'bg-[var(--app-bg-secondary)] text-[var(--app-text-muted)]'
            }`}
          >
            {t.profile}
          </button>
          <button
            onClick={() => {
              setActiveSection('myCards');
              hapticFeedback('light');
            }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
              activeSection === 'myCards' ? 'bg-[var(--app-accent)] text-white' : 'bg-[var(--app-bg-secondary)] text-[var(--app-text-muted)]'
            }`}
          >
            {t.myCards}
          </button>
          <button
            onClick={() => {
              setActiveSection('saved');
              hapticFeedback('light');
            }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
              activeSection === 'saved' ? 'bg-[var(--app-accent)] text-white' : 'bg-[var(--app-bg-secondary)] text-[var(--app-text-muted)]'
            }`}
          >
            {t.savedCards}
          </button>
        </div>

        {activeSection === 'myCards' && (
          <div className="space-y-2">
            {myCards.length === 0 ? (
              <p className="text-[var(--app-text-muted)] text-sm py-4 text-center">{t.noResults}</p>
            ) : (
              myCards.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]"
                >
                  <p className="font-medium">{c.optionA} vs {c.optionB}</p>
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
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)]"
                >
                  <p className="font-medium">{c.optionA} vs {c.optionB}</p>
                  <p className="text-xs text-[var(--app-text-muted)] mt-1">
                    {c.votesA + c.votesB} {t.totalVotes.toLowerCase()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
