import { useState, useEffect, useCallback, useRef } from 'react';
import { hapticFeedback, getTelegramWebApp, getTelegramUserId } from '@/lib/telegram';
import { getCards, voteCard } from '@/services/cards-service';
import { getCardsWithVotes } from '@/data/starter-cards';
import { useLocale } from '@/context/LocaleContext';
import { useUser } from '@/context/UserContext';
import type { VerdictCard } from '@/types/card';

interface CardFlowScreenProps {
  subsection: string;
  mode?: string | null;
  onBack: () => void;
  initialCard?: VerdictCard | null;
  onFirstVote?: () => void;
}

export function CardFlowScreen({ subsection, mode: _mode, onBack, initialCard, onFirstVote }: CardFlowScreenProps) {
  const { t } = useLocale();
  const { user, savedCardIds, toggleSavedCard } = useUser();
  const [cards, setCards] = useState<VerdictCard[]>([]);
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [lastChoice, setLastChoice] = useState<'A' | 'B' | null>(null);
  const [animating, setAnimating] = useState(false);
  const hasCalledOnFirstVote = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const firestoreCards = await getCards(subsection !== 'champion' ? subsection : undefined);
        if (cancelled) return;
        let list = firestoreCards.length > 0 ? firestoreCards : (() => {
          const fallback = getCardsWithVotes();
          const filtered = subsection && subsection !== 'champion'
            ? fallback.filter(c => c.category === subsection)
            : fallback;
          return filtered.length ? filtered : fallback;
        })();
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
        if (initialCard && !list.some(c => c.id === initialCard.id)) {
          list = [initialCard, ...list];
        }
        setCards(list);
        setIndex(0);
      }
    })();
    return () => { cancelled = true; };
  }, [subsection, initialCard?.id]);

  const currentCard = cards[index];
  const totalVotes = currentCard ? currentCard.votesA + currentCard.votesB : 0;
  const percentA = totalVotes > 0 ? Math.round((currentCard?.votesA ?? 0) / totalVotes * 100) : 50;
  const percentB = totalVotes > 0 ? Math.round((currentCard?.votesB ?? 0) / totalVotes * 100) : 50;

  const handleChoice = useCallback((choice: 'A' | 'B') => {
    if (!currentCard || animating) return;

    if (!hasCalledOnFirstVote.current && onFirstVote) {
      hasCalledOnFirstVote.current = true;
      onFirstVote();
    }

    setAnimating(true);
    hapticFeedback('medium');
    setLastChoice(choice);
    setStreak(s => s + 1);

    const userId = getTelegramUserId() ?? user?.userId ?? undefined;
    voteCard(currentCard.id, choice, userId).catch(() => {});

    setTimeout(() => {
      setAnimating(false);
      setLastChoice(null);
      setIndex(i => (i + 1) % cards.length);
    }, 450);
  }, [currentCard, animating, cards.length, onFirstVote, user?.userId]);

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
    const text = `${currentCard?.optionA} vs ${currentCard?.optionB}\n⚡ Кто лучше?\n${currentCard?.optionA} — ${percentA}%\n${currentCard?.optionB} — ${percentB}%\n\nА ты кого выберешь? 👇`;
    const url = `${window.location.origin}${window.location.pathname}?card=${currentCard?.id}`;
    if (tg?.switchInlineQuery) {
      tg.switchInlineQuery(text, ['users', 'groups', 'channels']);
    } else {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      window.open(shareUrl, '_blank');
    }
  };

  const showStreak = streak > 0 && (streak === 10 || streak === 25 || streak === 50 || streak === 100 || streak % 25 === 0);

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
      <div className="flex-shrink-0 px-4 py-2 flex items-center gap-2">
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

      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        <div className="flex-1 grid grid-cols-1 grid-rows-2 gap-1 p-2">
          <button
            onClick={() => handleChoice('A')}
            disabled={animating}
            className={`relative rounded-2xl overflow-hidden bg-[var(--app-bg-secondary)] flex items-center justify-center min-h-[120px] transition-all duration-300 ${
              lastChoice === 'A' ? 'scale-110 z-10' : lastChoice === 'B' ? 'scale-95 opacity-30' : ''
            }`}
          >
            {currentCard.imageA && (
              <img
                src={currentCard.imageA}
                alt=""
                className="absolute inset-0 w-full h-full object-contain opacity-90"
              />
            )}
            {currentCard.imageA && <span className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden />}
            <span className={`relative z-10 text-2xl font-bold px-4 text-center drop-shadow-lg ${currentCard.imageA ? 'text-white' : ''}`}>{currentCard.optionA}</span>
            {lastChoice === 'A' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 z-20">
                <span className="text-4xl font-bold text-white drop-shadow-lg">{percentA}%</span>
              </div>
            )}
          </button>

          <button
            onClick={() => handleChoice('B')}
            disabled={animating}
            className={`relative rounded-2xl overflow-hidden bg-[var(--app-bg-secondary)] flex items-center justify-center min-h-[120px] transition-all duration-300 ${
              lastChoice === 'B' ? 'scale-110 z-10' : lastChoice === 'A' ? 'scale-95 opacity-30' : ''
            }`}
          >
            {currentCard.imageB && (
              <img
                src={currentCard.imageB}
                alt=""
                className="absolute inset-0 w-full h-full object-contain opacity-90"
              />
            )}
            {currentCard.imageB && <span className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden />}
            <span className={`relative z-10 text-2xl font-bold px-4 text-center drop-shadow-lg ${currentCard.imageB ? 'text-white' : ''}`}>{currentCard.optionB}</span>
            {lastChoice === 'B' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 z-20">
                <span className="text-4xl font-bold text-white drop-shadow-lg">{percentB}%</span>
              </div>
            )}
          </button>
        </div>

        <div className="flex-shrink-0 px-4 py-3 text-center">
          <span className="text-lg font-bold text-[var(--app-text)]">
            {percentA}% vs {percentB}%
          </span>
        </div>

        {/* Streak badge */}
        {showStreak && !animating && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[var(--app-accent)] text-white font-bold animate-pulse">
            🔥 Серия: {streak}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-3 px-4 bg-[var(--app-bg)] border-t border-[var(--app-border)] pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <button
          onClick={isPaused ? handleResume : handleStop}
          className="flex flex-col items-center gap-1 text-[var(--app-text-muted)] active:opacity-70"
        >
          <span className="text-xl">{isPaused ? '▶️' : '⏸'}</span>
          <span className="text-xs">{isPaused ? t.resume : t.stop}</span>
        </button>
        <button
          onClick={() => {
            hapticFeedback('light');
            if (currentCard) toggleSavedCard(currentCard.id);
          }}
          className="flex flex-col items-center gap-1 text-[var(--app-text-muted)] active:opacity-70"
        >
          <span className="text-xl">{savedCardIds.includes(currentCard?.id ?? '') ? '❤️' : '🤍'}</span>
          <span className="text-xs">{t.savedCards}</span>
        </button>
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1 text-[var(--app-link)] active:opacity-70"
        >
          <span className="text-xl">🔗</span>
          <span className="text-xs">{t.share}</span>
        </button>
        <button
          onClick={() => {
            hapticFeedback('light');
            setShowStats(s => !s);
          }}
          className="flex flex-col items-center gap-1 text-[var(--app-text-muted)] active:opacity-70"
        >
          <span className="text-xl">📊</span>
          <span className="text-xs">{t.stats}</span>
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
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{currentCard.optionA}</span>
                <span className="font-semibold">{percentA}%</span>
              </div>
              <div className="flex justify-between">
                <span>{currentCard.optionB}</span>
                <span className="font-semibold">{percentB}%</span>
              </div>
              <p className="text-sm text-[var(--app-text-muted)] mt-2">
                {t.totalVotes}: {totalVotes}
              </p>
            </div>
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
