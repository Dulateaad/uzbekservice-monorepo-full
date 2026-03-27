import { useState, useEffect, useCallback, useRef } from 'react';
import { hapticFeedback, getTelegramWebApp, getTelegramUserId } from '@/lib/telegram';
import { getCards, voteCard } from '@/services/cards-service';
import { getCardsWithVotes } from '@/data/starter-cards';
import { filterSeenCards, markCardAsSeen } from '@/services/seen-cards-service';
import { loadStreak, saveStreak, isStreakMilestone } from '@/services/streak-service';
import { canVote, recordVote } from '@/services/rate-limit-service';
import { getCardOpinionBreakdown } from '@/services/world-opinion-service';
import { computeTrendStatus, getTrendLabel } from '@/services/trend-service';
import { getBattleOfDayCard } from '@/services/cards-service';
import { useLocale } from '@/context/LocaleContext';
import { formatVoteCount } from '@/lib/format-votes';
import { useUser } from '@/context/UserContext';
import type { VerdictCard } from '@/types/card';

interface CardFlowScreenProps {
  subsection: string;
  mode?: string | null;
  onBack: () => void;
  initialCard?: VerdictCard | null;
  onVoteCount?: (count: number) => void;
}

const CARD_TRANSITION_OUT_MS = 300;
const VOTE_FEEDBACK_MS = 400;

export function CardFlowScreen({ subsection, mode: _mode, onBack, initialCard, onVoteCount }: CardFlowScreenProps) {
  const { t, locale } = useLocale();
  const { user, savedCardIds, toggleSavedCard } = useUser();
  const [cards, setCards] = useState<VerdictCard[]>([]);
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(() => loadStreak().streak);
  const [isPaused, setIsPaused] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [lastChoice, setLastChoice] = useState<'A' | 'B' | null>(null);
  const [animating, setAnimating] = useState(false);
  const [opinionBreakdown, setOpinionBreakdown] = useState<Awaited<ReturnType<typeof getCardOpinionBreakdown>> | null>(null);
  const [cardTransitionPhase, setCardTransitionPhase] = useState<'idle' | 'out' | 'enter'>('idle');
  const [imageAFailed, setImageAFailed] = useState(false);
  const [imageBFailed, setImageBFailed] = useState(false);
  const touchStartY = useRef(0);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const userGeo = user?.country ? { country: user.country, city: user.city } : undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const battleCard = subsection === 'popular' ? await getBattleOfDayCard() : null;
        const firestoreCards = await getCards(
          subsection !== 'champion' ? subsection : undefined,
          50,
          userGeo
        );
        if (cancelled) return;
        let list = firestoreCards.length > 0 ? firestoreCards : (() => {
          const fallback = getCardsWithVotes();
          const filtered = subsection && subsection !== 'champion'
            ? fallback.filter(c => c.category === subsection)
            : fallback;
          return filtered.length ? filtered : fallback;
        })();
        const unfiltered = list;
        list = filterSeenCards(subsection, list);
        if (list.length === 0) list = unfiltered;
        if (battleCard && subsection === 'popular' && !list.some(c => c.id === battleCard.id)) {
          list = [battleCard, ...list];
        }
        if (initialCard && !list.some(c => c.id === initialCard.id)) {
          list = [initialCard, ...list];
        }
        setCards(list);
        setIndex(0);
      } catch {
        if (cancelled) return;
        const fallback = getCardsWithVotes();
        const filtered = subsection && subsection !== 'champion'
          ? fallback.filter(c => c.category === subsection)
          : fallback;
        let list = filtered.length ? filtered : fallback;
        const unfiltered = list;
        list = filterSeenCards(subsection, list);
        if (list.length === 0) list = unfiltered;
        if (initialCard && !list.some(c => c.id === initialCard.id)) {
          list = [initialCard, ...list];
        }
        setCards(list);
        setIndex(0);
      }
    })();
    return () => { cancelled = true; };
  }, [subsection, initialCard?.id, userGeo?.country, userGeo?.city]);

  const currentCard = cards[index];
  const nextCard = cards[(index + 1) % cards.length];

  useEffect(() => {
    setImageAFailed(false);
    setImageBFailed(false);
  }, [currentCard?.id, currentCard?.imageA, currentCard?.imageB]);

  const trendStatus = currentCard
    ? computeTrendStatus(currentCard.votesA, currentCard.votesB, currentCard.totalVotes)
    : null;

  useEffect(() => {
    if (user?.isPremium && showStats && currentCard) {
      getCardOpinionBreakdown(currentCard.id)
        .then((r) => setOpinionBreakdown(r))
        .catch(() => setOpinionBreakdown(null));
    } else {
      setOpinionBreakdown(null);
    }
  }, [user?.isPremium, showStats, currentCard?.id]);

  useEffect(() => {
    if (!nextCard) return;
    [nextCard.imageA, nextCard.imageB].forEach((src) => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [nextCard?.id, nextCard?.imageA, nextCard?.imageB]);

  const goToNextCard = useCallback(() => {
    if (cards.length === 0) return;
    if (reduceMotionRef.current) {
      setIndex((i) => (i + 1) % cards.length);
      return;
    }
    setCardTransitionPhase('out');
    window.setTimeout(() => {
      setIndex((i) => (i + 1) % cards.length);
      setCardTransitionPhase('enter');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCardTransitionPhase('idle');
        });
      });
    }, CARD_TRANSITION_OUT_MS);
  }, [cards.length]);

  const totalVotes = currentCard ? currentCard.votesA + currentCard.votesB : 0;
  const percentA = totalVotes > 0 ? Math.round((currentCard?.votesA ?? 0) / totalVotes * 100) : 50;
  const percentB = totalVotes > 0 ? Math.round((currentCard?.votesB ?? 0) / totalVotes * 100) : 50;

  const handleChoice = useCallback((choice: 'A' | 'B') => {
    if (!currentCard || animating) return;
    if (!canVote()) return;

    setAnimating(true);
    hapticFeedback('medium');
    setLastChoice(choice);
    recordVote();
    markCardAsSeen(subsection, currentCard.id);

    const newStreak = streak + 1;
    setStreak(newStreak);
    saveStreak(newStreak);
    onVoteCount?.(newStreak);

    const userId = getTelegramUserId() ?? user?.userId ?? undefined;
    const metadata = user
      ? {
          gender: user.gender,
          ageGroup: user.ageGroup,
          country: user.country,
          city: user.city,
        }
      : undefined;
    voteCard(currentCard.id, choice, userId, metadata).catch(() => {});

    window.setTimeout(() => {
      setLastChoice(null);
      if (reduceMotionRef.current) {
        setAnimating(false);
        setIndex((i) => (i + 1) % cards.length);
        return;
      }
      setCardTransitionPhase('out');
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % cards.length);
        setAnimating(false);
        setCardTransitionPhase('enter');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setCardTransitionPhase('idle');
          });
        });
      }, CARD_TRANSITION_OUT_MS);
    }, VOTE_FEEDBACK_MS);
  }, [currentCard, animating, cards.length, onVoteCount, streak, subsection, user]);

  const handleSkip = useCallback(() => {
    if (!currentCard || animating) return;
    hapticFeedback('light');
    markCardAsSeen(subsection, currentCard.id);
    goToNextCard();
  }, [currentCard, animating, subsection, goToNextCard]);

  const handleStop = () => {
    hapticFeedback('light');
    setIsPaused(true);
  };

  const handleResume = () => {
    hapticFeedback('light');
    setIsPaused(false);
  };

  const handleShare = () => {
    hapticFeedback('light');
    const tg = getTelegramWebApp();
    const url = `${window.location.origin}${window.location.pathname}?card=${currentCard?.id}`;
    const teamA = `Team ${currentCard?.optionA}`;
    const teamB = `Team ${currentCard?.optionB}`;
    const text = `⚔️ ${teamA} — ${percentA}% vs ${teamB} — ${percentB}%\n\nПомоги своей стороне победить — голосуй! 👇\n${url}`;
    if (tg?.switchInlineQuery) {
      tg.switchInlineQuery(text, ['users', 'groups', 'channels']);
    } else {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      window.open(shareUrl, '_blank');
    }
  };

  const showStreak = isStreakMilestone(streak);

  const gradientFor = (text: string) => {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h << 5) - h + text.charCodeAt(i);
    const hue = Math.abs(h % 360);
    return `linear-gradient(135deg, hsl(${hue}, 60%, 25%) 0%, hsl(${(hue + 40) % 360}, 70%, 35%) 100%)`;
  };

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg?.BackButton) {
      tg.BackButton.show();
      const handler = () => {
        hapticFeedback('light');
        onBack();
      };
      tg.BackButton.onClick(handler);
      return () => {
        tg.BackButton.offClick(handler);
        tg.BackButton.hide();
      };
    }
  }, [onBack]);

  if (!currentCard) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center">
        <p className="text-[var(--app-text-muted)]">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col pb-[calc(env(safe-area-inset-bottom)+80px)]">
      <div className="flex-shrink-0 px-3 py-1.5 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            hapticFeedback('light');
            onBack();
          }}
          className="flex items-center gap-1 text-[var(--app-text-muted)] active:opacity-70 text-sm"
        >
          <span>←</span>
          <span>{t.back}</span>
        </button>
      </div>

      <div
        className={`flex-shrink-0 flex-1 flex flex-col min-h-0 verdict-card-transition-layer ${
          cardTransitionPhase === 'out'
            ? 'verdict-card-transition-layer--out'
            : cardTransitionPhase === 'enter'
              ? 'verdict-card-transition-layer--enter'
              : 'verdict-card-transition-layer--idle'
        }`}
      >
        <div className="flex-shrink-0 px-3 pb-2 space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--app-text-muted)] text-center font-medium">
            {t.cardNowChoosing}
          </p>
          <h2 className="text-center text-[15px] sm:text-base font-semibold text-[var(--app-text)] leading-snug px-1">
            {currentCard.optionA}{' '}
            <span className="text-[var(--app-text-muted)] font-normal">{t.versus}</span>{' '}
            {currentCard.optionB}
          </h2>
          <div className="flex justify-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-lg bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-xs font-medium text-[var(--app-text)] max-w-[45%] truncate">
              {currentCard.optionA}
            </span>
            <span className="px-3 py-1 rounded-lg bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-xs font-medium text-[var(--app-text)] max-w-[45%] truncate">
              {currentCard.optionB}
            </span>
          </div>
          <p className="text-center text-sm font-medium text-[var(--app-text)]">
            {formatVoteCount(totalVotes, locale)}
          </p>
          <div className="flex items-center justify-center gap-4 pt-0.5 text-[11px] text-[var(--app-text-muted)]">
            <span className="flex items-center gap-1">
              <span aria-hidden>🔍</span>
              {t.cardMore}
            </span>
            <span className="flex items-center gap-1 min-w-0">
              <span aria-hidden>🔥</span>
              <span className="truncate">
                {trendStatus ? getTrendLabel(trendStatus) : t.cardChoosingHot}
              </span>
            </span>
          </div>
        </div>

        <div
          className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
          onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => {
            const dy = touchStartY.current - e.changedTouches[0].clientY;
            if (dy > 80 && !animating && cardTransitionPhase === 'idle') handleSkip();
          }}
        >
          <div className="flex-1 min-h-0 flex flex-col gap-1.5 p-2">
            <button
              onClick={() => handleChoice('A')}
              disabled={animating || cardTransitionPhase !== 'idle'}
              className={`verdict-choice-tile relative rounded-xl overflow-hidden flex items-center justify-center flex-1 min-h-0 min-h-[88px] ${
                lastChoice === 'A' ? 'scale-[1.04] z-10 shadow-lg shadow-black/20' : lastChoice === 'B' ? 'scale-[0.94] opacity-40' : ''
              }`}
              style={{
                background:
                  currentCard.imageA && !imageAFailed ? undefined : gradientFor(currentCard.optionA),
              }}
            >
            {currentCard.imageA && !imageAFailed ? (
              <>
                <img
                  src={currentCard.imageA}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-contain opacity-90"
                  onError={() => setImageAFailed(true)}
                />
                <span className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden />
              </>
            ) : null}
            <span className="relative z-10 text-xl sm:text-2xl font-bold px-4 text-center drop-shadow-lg text-white leading-tight">{currentCard.optionA}</span>
            {lastChoice === 'A' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 z-20">
                <span className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">{percentA}%</span>
              </div>
            )}
            </button>

            <button
              onClick={() => handleChoice('B')}
              disabled={animating || cardTransitionPhase !== 'idle'}
              className={`verdict-choice-tile relative rounded-xl overflow-hidden flex items-center justify-center flex-1 min-h-0 min-h-[88px] ${
                lastChoice === 'B' ? 'scale-[1.04] z-10 shadow-lg shadow-black/20' : lastChoice === 'A' ? 'scale-[0.94] opacity-40' : ''
              }`}
              style={{
                background:
                  currentCard.imageB && !imageBFailed ? undefined : gradientFor(currentCard.optionB),
              }}
            >
            {currentCard.imageB && !imageBFailed ? (
              <>
                <img
                  src={currentCard.imageB}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-contain opacity-90"
                  onError={() => setImageBFailed(true)}
                />
                <span className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden />
              </>
            ) : null}
            <span className="relative z-10 text-xl sm:text-2xl font-bold px-4 text-center drop-shadow-lg text-white leading-tight">{currentCard.optionB}</span>
              {lastChoice === 'B' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 z-20">
                  <span className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">{percentB}%</span>
                </div>
              )}
            </button>
          </div>

          <div className="flex-shrink-0 px-3 py-1 text-center">
            <span className="text-lg font-bold text-[var(--app-text)] transition-opacity duration-300">
              {percentA}% vs {percentB}%
            </span>
          </div>

          <button
            onClick={() => { hapticFeedback('light'); if (currentCard) toggleSavedCard(currentCard.id); }}
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/40 text-white transition-transform active:scale-95"
            aria-label="Save"
          >
            {savedCardIds.includes(currentCard?.id ?? '') ? '❤️' : '🤍'}
          </button>
          {showStreak && !animating && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[var(--app-accent)] text-white font-bold animate-pulse">
              🔥 Серия: {streak}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex items-stretch border-t border-[var(--app-border)] bg-[var(--app-bg)] pb-[calc(env(safe-area-inset-bottom)+8px)] pt-1">
        <button
          type="button"
          onClick={isPaused ? handleResume : handleStop}
          className="flex-1 min-w-0 py-2 px-1 text-xs font-medium text-[var(--app-text-muted)] active:opacity-70"
        >
          <span className="block truncate text-center">{isPaused ? t.resume : t.stop}</span>
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 min-w-0 py-2 px-1 text-xs font-medium text-[var(--app-accent)] active:opacity-70 border-x border-[var(--app-border)]"
        >
          <span className="block truncate text-center">{t.share}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            hapticFeedback('light');
            setShowStats(s => !s);
          }}
          className="flex-1 min-w-0 py-2 px-1 text-xs font-medium text-[var(--app-text-muted)] active:opacity-70"
        >
          <span className="block truncate text-center">{t.stats}</span>
        </button>
      </div>

      {showStats && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-20 p-4"
          onClick={() => setShowStats(false)}
        >
          <div
            className="bg-[var(--app-bg-secondary)] rounded-2xl p-6 max-w-sm w-full border border-[var(--app-border)]"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4 text-[var(--app-text)]">{t.stats}</h3>
            {user?.isPremium ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{currentCard.optionA}</span>
                  <span className="font-semibold">{percentA}%</span>
                </div>
                <div className="flex justify-between">
                  <span>{currentCard.optionB}</span>
                  <span className="font-semibold">{percentB}%</span>
                </div>
                <p className="text-sm text-[var(--app-text-muted)]">
                  {t.totalVotes}: {totalVotes}
                </p>
                {opinionBreakdown && opinionBreakdown.length > 1 && (
                  <div className="pt-2 border-t border-[var(--app-border)] space-y-1">
                    <p className="text-xs font-medium text-[var(--app-text-muted)]">{t.worldOpinion ?? 'World Opinion'}</p>
                    {opinionBreakdown.map((b) => (
                      <div key={b.label} className="flex justify-between text-sm">
                        <span>{b.label}</span>
                        <span>{b.percentA}% / {b.percentB}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[var(--app-text-muted)] py-4 text-center">
                {t.statsPremiumRequired}
              </p>
            )}
            <button
              onClick={() => setShowStats(false)}
              className="mt-4 w-full py-2 rounded-xl bg-[var(--app-accent)] text-white font-medium"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {isPaused && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-10">
          <div className="bg-[var(--app-bg-secondary)] rounded-2xl p-6 text-center border border-[var(--app-border)]">
            <p className="mb-4 text-[var(--app-text)]">{t.flowStopped}</p>
            <button
              onClick={handleResume}
              className="px-6 py-2 rounded-xl bg-[var(--app-accent)] text-white font-medium"
            >
              Продолжить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
