import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { hapticFeedback, getTelegramWebApp, getTelegramUserId } from '@/lib/telegram';
import { getCards, voteCard } from '@/services/cards-service';
import { getCardsWithVotes } from '@/data/starter-cards';
import { markCardAsSeen } from '@/services/seen-cards-service';
import { loadStreak, saveStreak, isStreakMilestone } from '@/services/streak-service';
import { canVote, recordVote } from '@/services/rate-limit-service';
import { getCardOpinionBreakdown } from '@/services/world-opinion-service';
import { useLocale } from '@/context/LocaleContext';
import { useUser } from '@/context/UserContext';
import type { VerdictCard } from '@/types/card';
import {
  parseChampionCategory,
  cardMatchesChampionCategory,
  buildChampionFightersFromCards,
  findCardVoteForDuel,
} from '@/data/champion-categories';
import { FEED_PAST_MAX } from '@/feed/swipe-feed-constants';
import { SwipeFeedViewport } from '@/feed/SwipeFeedViewport';
import { useSwipeFeed } from '@/feed/useSwipeFeed';

interface CardFlowScreenProps {
  subsection: string;
  mode?: string | null;
  onBack: () => void;
  initialCard?: VerdictCard | null;
  onVoteCount?: (count: number) => void;
}

const CARD_TRANSITION_OUT_MS = 350;
const VOTE_FEEDBACK_MS = 700;
const CHAMPION_SLIDE_MS = 600;
/** Минимальный свайп (px) — только режим чемпиона (поток = SwipeFeedViewport) */
const SWIPE_THRESHOLD = 26;

export function CardFlowScreen({ subsection, mode, onBack, initialCard, onVoteCount }: CardFlowScreenProps) {
  const { t } = useLocale();
  const { user, savedCardIds, toggleSavedCard } = useUser();
  const [streak, setStreak] = useState(() => loadStreak().streak);
  const [showStats, setShowStats] = useState(false);
  const [hasVotedOnce, setHasVotedOnce] = useState(false);
  const [lastChoice, setLastChoice] = useState<'A' | 'B' | null>(null);
  const [animating, setAnimating] = useState(false);
  const [opinionBreakdown, setOpinionBreakdown] = useState<Awaited<ReturnType<typeof getCardOpinionBreakdown>> | null>(null);
  const [cardTransitionPhase, setCardTransitionPhase] = useState<'idle' | 'out' | 'enter'>('idle');
  const [imageAFailed, setImageAFailed] = useState(false);
  const [imageBFailed, setImageBFailed] = useState(false);
  const [championPhase, setChampionPhase] = useState<'idle' | 'collapse' | 'enter'>('idle');
  const [champArenaCards, setChampArenaCards] = useState<VerdictCard[]>([]);
  const [challengerSlot, setChallengerSlot] = useState(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const activeTouchId = useRef<number | null>(null);
  const swipeZoneRef = useRef<HTMLDivElement>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const userGeo = user?.country ? { country: user.country, city: user.city } : undefined;
  const champCategoryId = parseChampionCategory(mode ?? null);
  const isChampion = subsection === 'champion' && champCategoryId !== null;
  const feedUserId = getTelegramUserId() ?? user?.userId ?? null;

  const feed = useSwipeFeed({
    subsection,
    initialCard: initialCard ?? null,
    userGeo,
    userId: feedUserId,
    enabled: !isChampion,
  });

  const loadChampionArena = useCallback(async () => {
    if (!champCategoryId) return;
    try {
      const firestoreCards = await getCards(undefined, FEED_PAST_MAX, userGeo);
      let list = firestoreCards.length > 0 ? firestoreCards : getCardsWithVotes();
      list = list.filter(c => cardMatchesChampionCategory(c, champCategoryId));
      if (list.length === 0) {
        list = getCardsWithVotes().filter(c => cardMatchesChampionCategory(c, champCategoryId));
      }
      if (list.length > FEED_PAST_MAX) list = list.slice(0, FEED_PAST_MAX);
      setChampArenaCards(list);
    } catch {
      const fb = getCardsWithVotes().filter(c => cardMatchesChampionCategory(c, champCategoryId));
      setChampArenaCards(fb.length > FEED_PAST_MAX ? fb.slice(0, FEED_PAST_MAX) : fb);
    }
  }, [champCategoryId, userGeo?.country, userGeo?.city]);

  useEffect(() => {
    if (!isChampion || !champCategoryId) return;
    let cancelled = false;
    (async () => {
      await loadChampionArena();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [isChampion, champCategoryId, loadChampionArena]);

  useEffect(() => {
    if (!isChampion || !champCategoryId) return;
    const id = window.setInterval(() => {
      loadChampionArena();
    }, 5000);
    return () => window.clearInterval(id);
  }, [isChampion, champCategoryId, loadChampionArena]);

  const currentCard = !isChampion
    ? feed.state.current ?? undefined
    : champArenaCards[0];
  const nextCard = !isChampion ? feed.getVisibleSlots().next : null;

  const champFighters = useMemo(
    () => buildChampionFightersFromCards(champArenaCards),
    [champArenaCards],
  );
  const leader = champFighters[0];
  const challengerIdx =
    champFighters.length > 1 ? 1 + (challengerSlot % (champFighters.length - 1)) : 0;
  const challenger = champFighters[challengerIdx] ?? leader;

  useEffect(() => {
    setImageAFailed(false);
    setImageBFailed(false);
  }, [
    isChampion,
    isChampion ? `${leader?.key ?? ''}-${challenger?.key ?? ''}` : currentCard?.id,
    currentCard?.imageA,
    currentCard?.imageB,
  ]);

  useEffect(() => {
    if (!user?.isPremium || !showStats) {
      setOpinionBreakdown(null);
      return;
    }
    const statsCardId = isChampion ? champArenaCards[0]?.id : currentCard?.id;
    if (!statsCardId) {
      setOpinionBreakdown(null);
      return;
    }
    getCardOpinionBreakdown(statsCardId)
      .then((r) => setOpinionBreakdown(r))
      .catch(() => setOpinionBreakdown(null));
  }, [user?.isPremium, showStats, currentCard?.id, isChampion, champArenaCards]);

  useEffect(() => {
    if (!nextCard) return;
    [nextCard.imageA, nextCard.imageB].forEach((src) => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [nextCard?.id, nextCard?.imageA, nextCard?.imageB]);

  const totalVotes = currentCard ? currentCard.votesA + currentCard.votesB : 0;
  const percentA = totalVotes > 0 ? Math.round((currentCard?.votesA ?? 0) / totalVotes * 100) : 50;
  const percentB = totalVotes > 0 ? Math.round((currentCard?.votesB ?? 0) / totalVotes * 100) : 50;

  const handleChoice = useCallback((choice: 'A' | 'B') => {
    if (animating) return;
    if (!canVote()) return;

    if (isChampion && champCategoryId) {
      if (!leader || !challenger || leader.key === challenger.key) return;
      const tpl = leader.sourceCards[0] ?? champArenaCards[0];
      if (!tpl) return;

      const target = findCardVoteForDuel(leader, challenger, choice, champArenaCards);
      if (!target) return;

      setAnimating(true);
      hapticFeedback('medium');
      setLastChoice(choice);
      if (!hasVotedOnce) setHasVotedOnce(true);
      recordVote();

      const newStreak = streak + 1;
      setStreak(newStreak);
      saveStreak(newStreak);
      onVoteCount?.(newStreak);

      const userId = getTelegramUserId() ?? user?.userId ?? undefined;
      const metadata = user
        ? { gender: user.gender, ageGroup: user.ageGroup, country: user.country, city: user.city }
        : undefined;
      voteCard(target.cardId, target.choice, userId, metadata).catch(() => {});

      window.setTimeout(() => {
        setChampionPhase('collapse');
        window.setTimeout(() => {
          loadChampionArena();
          setImageAFailed(false);
          setImageBFailed(false);
          setChampionPhase('enter');
          window.setTimeout(() => {
            setChampionPhase('idle');
            setLastChoice(null);
            setAnimating(false);
          }, 400);
        }, CHAMPION_SLIDE_MS);
      }, VOTE_FEEDBACK_MS);
      return;
    }

    // Normal mode
    if (!currentCard) return;
    const voteToken = feed.registerVoteAttempt(currentCard.id);
    if (voteToken === null) return;
    setAnimating(true);
    hapticFeedback('medium');
    setLastChoice(choice);
    if (!hasVotedOnce) setHasVotedOnce(true);
    recordVote();
    markCardAsSeen(subsection, currentCard.id);

    const newStreak = streak + 1;
    setStreak(newStreak);
    saveStreak(newStreak);
    onVoteCount?.(newStreak);

    const userId = getTelegramUserId() ?? user?.userId ?? undefined;
    const metadata = user
      ? { gender: user.gender, ageGroup: user.ageGroup, country: user.country, city: user.city }
      : undefined;
    const votedCardId = currentCard.id;
    void voteCard(votedCardId, choice, userId, metadata)
      .then(() => {
        feed.mergeCardIntoState({ ...currentCard, userVote: choice });
      })
      .catch(() => {})
      .finally(() => {
        feed.finishVoteAttempt(votedCardId, voteToken);
      });

    window.setTimeout(() => {
      feed.commitNextAfterSwipe();
      window.setTimeout(() => {
        setLastChoice(null);
        setAnimating(false);
      }, CARD_TRANSITION_OUT_MS + 50);
    }, VOTE_FEEDBACK_MS);
  }, [
    currentCard,
    animating,
    feed,
    onVoteCount,
    streak,
    subsection,
    user,
    isChampion,
    hasVotedOnce,
    champCategoryId,
    leader,
    challenger,
    champArenaCards,
    loadChampionArena,
  ]);

  const handleSkip = useCallback(() => {
    if (animating) return;
    hapticFeedback('light');
    if (isChampion) {
      setChallengerSlot(s => s + 1);
      setImageAFailed(false);
      setImageBFailed(false);
    } else {
      if (!feed.canSwipeNext()) {
        void feed.fetchMoreRemote();
        return;
      }
      feed.commitNextAfterSwipe();
    }
  }, [currentCard, animating, subsection, isChampion, leader, challenger, champArenaCards, feed]);

  const applyVerticalSwipe = useCallback((dy: number, dx: number) => {
    if (!isChampion) return;
    if (Math.abs(dy) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 28) return;
    if (animating) return;
    if (cardTransitionPhase !== 'idle') return;
    if (championPhase !== 'idle') return;

    if (dy > 0) {
      hapticFeedback('medium');
      handleSkip();
    } else if (challengerSlot > 0) {
      hapticFeedback('light');
      setLastChoice(null);
      setAnimating(false);
      setCardTransitionPhase('idle');
      setChampionPhase('idle');
      setImageAFailed(false);
      setImageBFailed(false);
      setChallengerSlot(s => s - 1);
    } else {
      hapticFeedback('light');
    }
  }, [
    animating,
    cardTransitionPhase,
    isChampion,
    championPhase,
    handleSkip,
    challengerSlot,
  ]);

  const captureSwipeStart = (clientY: number, clientX: number) => {
    touchStartY.current = clientY;
    touchStartX.current = clientX;
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

  /* Telegram / iOS: блокируем нативный скролл по вертикали — иначе «вниз» съедается (в т.ч. на экране истории) */
  useEffect(() => {
    const el = swipeZoneRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !e.cancelable) return;
      const finger = e.touches[0];
      const dy = Math.abs(touchStartY.current - finger.clientY);
      const dx = Math.abs(touchStartX.current - finger.clientX);
      if (dy > 14 && dy > dx * 0.85) e.preventDefault();
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, [subsection, currentCard?.id, isChampion]);

  /** Capture-фаза + identifier: жест доходит даже с кнопок-карточек; WebView меньше теряет touchend */
  const handleTouchStartCapture = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    activeTouchId.current = t.identifier;
    captureSwipeStart(t.clientY, t.clientX);
  };

  const handleTouchEndCapture = (e: React.TouchEvent) => {
    let endTouch: React.Touch | undefined;
    if (activeTouchId.current !== null) {
      endTouch = Array.from(e.changedTouches).find(ct => ct.identifier === activeTouchId.current);
    }
    const t = endTouch ?? e.changedTouches[0];
    activeTouchId.current = null;
    if (!t) return;
    applyVerticalSwipe(touchStartY.current - t.clientY, touchStartX.current - t.clientX);
  };

  const handleTouchCancelCapture = () => {
    activeTouchId.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    captureSwipeStart(e.clientY, e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    applyVerticalSwipe(touchStartY.current - e.clientY, touchStartX.current - e.clientX);
  };

  if (isChampion && champArenaCards.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center px-6">
        <p className="text-[var(--app-text-muted)] text-center">{t.loading}</p>
      </div>
    );
  }

  if (isChampion && champFighters.length < 2) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center px-6">
        <p className="text-[var(--app-text-muted)] text-center">{t.championSectorEmpty}</p>
      </div>
    );
  }

  if (!isChampion) {
    if (feed.state.initError) {
      return (
        <div className="min-h-screen bg-[var(--app-bg)] flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-[var(--app-text-muted)] text-center">{t.loading}</p>
          <button
            type="button"
            onClick={() => void feed.init()}
            className="px-4 py-2 rounded-xl bg-[var(--app-accent)] text-white text-sm font-medium"
          >
            {t.resume}
          </button>
        </div>
      );
    }
    if (!feed.state.current) {
      return (
        <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center">
          <p className="text-[var(--app-text-muted)]">{t.loading}</p>
        </div>
      );
    }
  }

  const topFighter = isChampion
    ? { text: leader.displayText, image: leader.image, votes: leader.votes }
    : { text: currentCard?.optionA ?? '', image: currentCard?.imageA };
  const bottomFighter = isChampion
    ? { text: challenger.displayText, image: challenger.image, votes: challenger.votes }
    : { text: currentCard?.optionB ?? '', image: currentCard?.imageB };

  const champSaveCardId = isChampion ? (leader.sourceCards[0]?.id ?? champArenaCards[0]?.id ?? '') : (currentCard?.id ?? '');
  const isSaved = savedCardIds.includes(champSaveCardId);

  const handleShare = () => {
    hapticFeedback('light');
    const tg = getTelegramWebApp();
    const cardParam = isChampion ? champSaveCardId : (currentCard?.id ?? '');
    const url = `${window.location.origin}${window.location.pathname}?card=${cardParam}`;
    const shareA = isChampion ? topFighter.text : (currentCard?.optionA ?? '');
    const shareB = isChampion ? bottomFighter.text : (currentCard?.optionB ?? '');
    const text = isChampion
      ? `👑 ${shareA} vs ⚔️ ${shareB}\n\nКто победит? Голосуй! 👇\n${url}`
      : `⚔️ Team ${shareA} — ${percentA}% vs Team ${shareB} — ${percentB}%\n\nПомоги своей стороне победить — голосуй! 👇\n${url}`;
    if (tg?.switchInlineQuery) {
      tg.switchInlineQuery(text, ['users', 'groups', 'channels']);
    } else {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      window.open(shareUrl, '_blank');
    }
  };

  /* ── main card flow ── */
  const champClassA = isChampion && championPhase === 'collapse'
    ? (lastChoice === 'A' ? 'verdict-winner-expand' : 'verdict-loser-collapse')
    : '';

  const champClassB = isChampion
    ? (championPhase === 'collapse'
      ? (lastChoice === 'B' ? 'verdict-winner-expand' : 'verdict-loser-collapse')
      : championPhase === 'enter'
        ? 'verdict-challenger-enter'
        : '')
    : '';

  const tileA = (
    <button
      type="button"
      onClick={() => handleChoice('A')}
      disabled={animating || (cardTransitionPhase !== 'idle' && !isChampion)}
      className={`verdict-choice-tile verdict-duel-half relative rounded-none overflow-hidden flex items-center justify-center flex-1 min-h-0 min-h-[80px] border-b border-white/10 ${champClassA} ${
        lastChoice === 'A' ? 'z-10' : lastChoice === 'B' && championPhase !== 'collapse' ? 'opacity-50' : ''
      }`}
      style={{
        background: topFighter.image && !imageAFailed ? undefined : gradientFor(topFighter.text),
      }}
    >
      {topFighter.image && !imageAFailed ? (
        <>
          <img
            src={topFighter.image}
            alt=""
            decoding="async"
            loading="eager"
            fetchPriority="high"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            onError={() => setImageAFailed(true)}
          />
          <span className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden />
        </>
      ) : null}

      {/* Leader: live votes */}
      {isChampion && (
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-0.5">
          <div className="flex items-center gap-1 bg-yellow-500/90 text-black text-xs font-bold px-2 py-0.5 rounded-full">
            <span>👑</span>
            <span>{t.championLeader}</span>
          </div>
          <span className="text-[11px] font-semibold text-white/90 drop-shadow px-1">
            {leader.votes.toLocaleString()} {t.championVotes}
          </span>
        </div>
      )}

      <span className="relative z-10 text-xl sm:text-2xl font-bold px-4 text-center drop-shadow-lg text-white leading-tight">{topFighter.text}</span>

      {!lastChoice && !hasVotedOnce && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 animate-pulse">
          <span className="text-base">👆</span>
          <span className="text-[11px] text-white/70 font-medium">жми сюда</span>
        </div>
      )}
      {lastChoice && !isChampion && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20 verdict-percent-reveal">
          <span className="text-4xl font-black text-white drop-shadow-lg">{percentA}%</span>
        </div>
      )}
      {lastChoice === 'A' && isChampion && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20 verdict-percent-reveal">
          <span className="text-3xl font-black text-green-400 drop-shadow-lg">✓ WINNER</span>
        </div>
      )}
      {lastChoice === 'B' && isChampion && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20 verdict-percent-reveal">
          <span className="text-3xl font-black text-red-400/80 drop-shadow-lg">✗</span>
        </div>
      )}
    </button>
  );

  const feedSlots = !isChampion ? feed.getVisibleSlots() : { prev: null, curr: null, next: null };

  const renderFeedSlot = (card: VerdictCard, role: 'prev' | 'current' | 'next') => {
    const interactive = role === 'current' && card.id === feed.state.current?.id;
    const dim = interactive ? '' : 'pointer-events-none opacity-[0.78]';
    const top = { text: card.optionA, image: card.imageA };
    const bottom = { text: card.optionB, image: card.imageB };
    const tot = card.votesA + card.votesB;
    const slotPA = tot > 0 ? Math.round((card.votesA / tot) * 100) : 50;
    const slotPB = tot > 0 ? Math.round((card.votesB / tot) * 100) : 50;
    const revealA = interactive && lastChoice ? percentA : slotPA;
    const revealB = interactive && lastChoice ? percentB : slotPB;
    return (
      <div className={`verdict-duel-unified flex h-full min-h-0 flex-1 flex-col rounded-2xl overflow-hidden ring-1 ring-white/12 shadow-lg bg-black/10 ${dim}`}>
        <button
          type="button"
          onClick={() => interactive && handleChoice('A')}
          disabled={!interactive || animating || (cardTransitionPhase !== 'idle' && !isChampion)}
          className="verdict-choice-tile verdict-duel-half relative flex min-h-0 flex-1 min-h-[80px] flex-shrink-0 items-center justify-center overflow-hidden rounded-none border-b border-white/10"
          style={{
            background: top.image && !imageAFailed ? undefined : gradientFor(top.text),
          }}
        >
          {card.userVote === 'A' ? (
            <span className="pointer-events-none absolute top-2 left-2 z-20 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              Вы
            </span>
          ) : null}
          {top.image && !imageAFailed ? (
            <>
              <img
                src={top.image}
                alt=""
                decoding="async"
                loading="eager"
                fetchPriority={interactive ? 'high' : 'low'}
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover opacity-90"
                onError={() => interactive && setImageAFailed(true)}
              />
              <span className="pointer-events-none absolute inset-0 bg-black/30" aria-hidden />
            </>
          ) : null}
          <span className="relative z-10 px-4 text-center text-xl font-bold leading-tight text-white drop-shadow-lg sm:text-2xl">{top.text}</span>
          {interactive && lastChoice && (
            <div className="verdict-percent-reveal absolute inset-0 z-20 flex items-center justify-center bg-black/30">
              <span className="text-4xl font-black text-white drop-shadow-lg">{revealA}%</span>
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => interactive && handleChoice('B')}
          disabled={!interactive || animating || (cardTransitionPhase !== 'idle' && !isChampion)}
          className="verdict-choice-tile verdict-duel-half relative flex min-h-0 flex-1 min-h-[80px] flex-shrink-0 items-center justify-center overflow-hidden rounded-none"
          style={{
            background: bottom.image && !imageBFailed ? undefined : gradientFor(bottom.text),
          }}
        >
          {card.userVote === 'B' ? (
            <span className="pointer-events-none absolute top-2 left-2 z-20 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              Вы
            </span>
          ) : null}
          {bottom.image && !imageBFailed ? (
            <>
              <img
                src={bottom.image}
                alt=""
                decoding="async"
                loading="eager"
                fetchPriority={interactive ? 'high' : 'low'}
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover opacity-90"
                onError={() => interactive && setImageBFailed(true)}
              />
              <span className="pointer-events-none absolute inset-0 bg-black/30" aria-hidden />
            </>
          ) : null}
          <span className="relative z-10 px-4 text-center text-xl font-bold leading-tight text-white drop-shadow-lg sm:text-2xl">{bottom.text}</span>
          {interactive && lastChoice && (
            <div className="verdict-percent-reveal absolute inset-0 z-20 flex items-center justify-center bg-black/30">
              <span className="text-4xl font-black text-white drop-shadow-lg">{revealB}%</span>
            </div>
          )}
        </button>
      </div>
    );
  };

  const tileB = (
    <button
      type="button"
      onClick={() => handleChoice('B')}
      disabled={animating || (cardTransitionPhase !== 'idle' && !isChampion)}
      className={`verdict-choice-tile verdict-duel-half relative rounded-none overflow-hidden flex items-center justify-center flex-1 min-h-0 min-h-[80px] ${champClassB} ${
        lastChoice === 'B' ? 'z-10' : lastChoice === 'A' && championPhase !== 'collapse' ? 'opacity-50' : ''
      }`}
      style={{
        background: bottomFighter.image && !imageBFailed ? undefined : gradientFor(bottomFighter.text),
      }}
    >
      {bottomFighter.image && !imageBFailed ? (
        <>
          <img
            src={bottomFighter.image}
            alt=""
            decoding="async"
            loading="eager"
            fetchPriority="high"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            onError={() => setImageBFailed(true)}
          />
          <span className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden />
        </>
      ) : null}

      {isChampion && (
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-0.5">
          <div className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {t.championChallenger}
          </div>
          <span className="text-[11px] font-semibold text-white/90 drop-shadow px-1">
            {challenger.votes.toLocaleString()} {t.championVotes}
          </span>
        </div>
      )}

      <span className="relative z-10 text-xl sm:text-2xl font-bold px-4 text-center drop-shadow-lg text-white leading-tight">{bottomFighter.text}</span>

      {!lastChoice && !hasVotedOnce && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 animate-pulse">
          <span className="text-[11px] text-white/70 font-medium">жми сюда</span>
          <span className="text-base">👆</span>
        </div>
      )}
      {lastChoice && !isChampion && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20 verdict-percent-reveal">
          <span className="text-4xl font-black text-white drop-shadow-lg">{percentB}%</span>
        </div>
      )}
      {lastChoice && isChampion && (() => {
        const tot = leader.votes + challenger.votes;
        const pBot = tot > 0 ? Math.round((challenger.votes / tot) * 100) : 50;
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 z-20 verdict-percent-reveal">
            <span className="text-4xl font-black text-white drop-shadow-lg">{pBot}%</span>
          </div>
        );
      })()}
    </button>
  );

  return (
    <div className="h-full bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col">
      <div
        className={
          isChampion
            ? `flex-1 flex flex-col min-h-0 verdict-card-transition-layer ${
                cardTransitionPhase === 'out'
                  ? 'verdict-card-transition-layer--out'
                  : cardTransitionPhase === 'enter'
                    ? 'verdict-card-transition-layer--enter'
                    : 'verdict-card-transition-layer--idle'
              }`
            : 'flex min-h-0 flex-1 flex-col'
        }
      >
        <div
          ref={swipeZoneRef}
          className="verdict-feed-swipe-zone flex-1 flex min-h-0 relative overflow-hidden select-none"
          onTouchStartCapture={handleTouchStartCapture}
          onTouchEndCapture={handleTouchEndCapture}
          onTouchCancelCapture={handleTouchCancelCapture}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          {!isChampion ? (
            <div className="relative min-h-0 flex-1 flex flex-col p-2 pr-0">
              {feed.state.fetchError && (
                <div className="absolute left-2 right-14 top-2 z-40 rounded-lg bg-black/75 px-2 py-1.5 text-center text-[11px] text-amber-100">
                  {t.loading} · <button type="button" className="underline" onClick={() => void feed.fetchMoreRemote()}>{t.resume}</button>
                </div>
              )}
              <SwipeFeedViewport
                prevCard={feedSlots.prev}
                currentCard={feedSlots.curr}
                nextCard={feedSlots.next}
                canSwipeNext={feed.canSwipeNext()}
                canSwipePrev={feed.canSwipePrev()}
                futureEmpty={feed.futureEmpty}
                onCommittedNext={feed.commitNextAfterSwipe}
                onCommittedPrev={feed.commitPrevAfterSwipe}
                onFutureEmpty={() => void feed.fetchMoreRemote()}
                renderDuel={renderFeedSlot}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col p-2 pr-0">
              <div className="verdict-duel-unified flex min-h-0 flex-1 flex-col rounded-2xl bg-black/10 shadow-lg ring-1 ring-white/12">
                {tileA}
                {tileB}
              </div>
            </div>
          )}

          {/* TikTok-style right action bar — чёрные иконки на светлой подложке для контраста */}
          <div className="flex-shrink-0 w-12 flex flex-col items-center justify-end gap-5 pb-4 pt-2">
            {/* Save / heart */}
            <button
              onClick={() => { hapticFeedback('light'); if (champSaveCardId) toggleSavedCard(champSaveCardId); }}
              className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md ring-1 ring-black/10 ${isSaved ? 'bg-red-50' : 'bg-white/95'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isSaved ? '#ef4444' : 'none'} stroke={isSaved ? '#ef4444' : '#171717'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <span className="text-[10px] font-medium text-neutral-900 drop-shadow-sm">{isSaved ? '♥' : ''}</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
            >
              <div className="w-9 h-9 rounded-full bg-white/95 shadow-md ring-1 ring-black/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </div>
            </button>

            {/* Stats */}
            <button
              onClick={() => { hapticFeedback('light'); setShowStats(s => !s); }}
              className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
            >
              <div className="w-9 h-9 rounded-full bg-white/95 shadow-md ring-1 ring-black/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
            </button>

          </div>

          {/* Streak badge */}
          {showStreak && !animating && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[var(--app-accent)] text-white text-sm font-bold animate-pulse z-30">
              🔥 {streak}
            </div>
          )}

          {/* TikTok: вверх — следующая дуэль, вниз — что уже выбирал */}
          <div className="pointer-events-none absolute left-0 bottom-0 right-12 z-[25] flex justify-between items-end gap-2 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-16 bg-gradient-to-t from-black/65 via-black/25 to-transparent">
            <span className="max-w-[42%] text-left text-[11px] font-semibold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              ↓ {t.feedTikTokPast}
            </span>
            <span className="max-w-[42%] text-right text-[11px] font-semibold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              {t.feedTikTokNext} ↑
            </span>
          </div>
        </div>
      </div>

      {/* Stats modal */}
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
                {isChampion ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span>👑 {leader.displayText}</span>
                      <span className="font-semibold text-yellow-500">{leader.votes.toLocaleString()} {t.championVotes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>⚔️ {challenger.displayText}</span>
                      <span className="font-semibold">{challenger.votes.toLocaleString()} {t.championVotes}</span>
                    </div>
                    <p className="text-sm text-[var(--app-text-muted)]">
                      {t.championNamesInSector}: {champFighters.length}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>{topFighter.text}</span>
                      <span className="font-semibold">{percentA}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{bottomFighter.text}</span>
                      <span className="font-semibold">{percentB}%</span>
                    </div>
                    <p className="text-sm text-[var(--app-text-muted)]">
                      {t.totalVotes}: {totalVotes}
                    </p>
                  </>
                )}
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
    </div>
  );
}
