import { useCallback, useEffect, useRef, useState } from 'react';
import type { VerdictCard } from '@/types/card';
import {
  SWIPE_ANIMATION_MS,
  SWIPE_DISTANCE_THRESHOLD_PX,
  SWIPE_VELOCITY_THRESHOLD,
} from '@/feed/swipe-feed-constants';
import { prefetchCardImages } from '@/feed/prefetch-card-images';

type SlotRole = 'prev' | 'current' | 'next';

export interface SwipeFeedViewportProps {
  prevCard: VerdictCard | null;
  currentCard: VerdictCard | null;
  nextCard: VerdictCard | null;
  canSwipeNext: boolean;
  canSwipePrev: boolean;
  futureEmpty: boolean;
  onCommittedNext: () => void;
  onCommittedPrev: () => void;
  onFutureEmpty: () => void;
  renderDuel: (card: VerdictCard, role: SlotRole) => React.ReactNode;
}

export function SwipeFeedViewport({
  prevCard,
  currentCard,
  nextCard,
  canSwipeNext,
  canSwipePrev,
  futureEmpty,
  onCommittedNext,
  onCommittedPrev,
  onFutureEmpty,
  renderDuel,
}: SwipeFeedViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [slotH, setSlotH] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [slideNudge, setSlideNudge] = useState(0);
  const [transitionMs, setTransitionMs] = useState(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchT0 = useRef(0);
  const activeId = useRef<number | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    prefetchCardImages(prevCard, 'low');
    prefetchCardImages(currentCard, 'high');
    prefetchCardImages(nextCard, 'high');
  }, [prevCard?.id, currentCard?.id, nextCard?.id]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSlotH(el.clientHeight);
    });
    ro.observe(el);
    setSlotH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const runCommitNext = useCallback(() => {
    setTransitionMs(0);
    setSlideNudge(0);
    setDragPx(0);
    onCommittedNext();
    animatingRef.current = false;
  }, [onCommittedNext]);

  const runCommitPrev = useCallback(() => {
    setTransitionMs(0);
    setSlideNudge(0);
    setDragPx(0);
    onCommittedPrev();
    animatingRef.current = false;
  }, [onCommittedPrev]);

  const finishSwipeNext = useCallback(() => {
    if (!slotH) {
      runCommitNext();
      return;
    }
    animatingRef.current = true;
    setTransitionMs(SWIPE_ANIMATION_MS);
    setSlideNudge(-slotH);
    window.setTimeout(runCommitNext, SWIPE_ANIMATION_MS);
  }, [slotH, runCommitNext]);

  const finishSwipePrev = useCallback(() => {
    if (!slotH) {
      runCommitPrev();
      return;
    }
    animatingRef.current = true;
    setTransitionMs(SWIPE_ANIMATION_MS);
    setSlideNudge(slotH);
    window.setTimeout(runCommitPrev, SWIPE_ANIMATION_MS);
  }, [slotH, runCommitPrev]);

  const shouldTriggerSwipe = useCallback((deltaX: number, deltaY: number, deltaMs: number) => {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const isVertical = absY > absX;
    const hasDistance = absY >= SWIPE_DISTANCE_THRESHOLD_PX;
    const vel = deltaMs > 0 ? absY / deltaMs : 0;
    const hasVelocity = vel >= SWIPE_VELOCITY_THRESHOLD;
    return isVertical && (hasDistance || hasVelocity);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (animatingRef.current) return;
    const t = e.touches[0];
    if (!t) return;
    activeId.current = t.identifier;
    touchStartY.current = t.clientY;
    touchStartX.current = t.clientX;
    touchT0.current = performance.now();
    setDragPx(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (activeId.current === null || animatingRef.current) return;
    const t = Array.from(e.touches).find(x => x.identifier === activeId.current);
    if (!t) return;
    setDragPx(t.clientY - touchStartY.current);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (activeId.current === null) return;
    let t: React.Touch | undefined;
    t = Array.from(e.changedTouches).find(x => x.identifier === activeId.current);
    activeId.current = null;
    if (!t) {
      setDragPx(0);
      return;
    }
    const deltaY = t.clientY - touchStartY.current;
    const deltaX = t.clientX - touchStartX.current;
    const dt = Math.max(1, performance.now() - touchT0.current);
    setDragPx(0);

    if (!shouldTriggerSwipe(deltaX, deltaY, dt)) return;

    /* deltaY < 0 = палец вверх → следующая карточка */
    if (deltaY < 0) {
      if (!canSwipeNext) {
        if (futureEmpty) onFutureEmpty();
        return;
      }
      finishSwipeNext();
      return;
    }
    if (deltaY > 0) {
      if (!canSwipePrev) return;
      finishSwipePrev();
    }
  };

  const handleTouchCancel = () => {
    activeId.current = null;
    setDragPx(0);
  };

  const baseY = slotH > 0 ? -slotH : 0;
  const translateY = baseY + dragPx + slideNudge;

  const slot = (card: VerdictCard | null, role: SlotRole) => (
    <div
      className="w-full flex-shrink-0 flex flex-col min-h-0 overflow-hidden bg-[var(--app-bg)]"
      style={{ height: slotH || '100%' }}
    >
      {card ? renderDuel(card, role) : <div className="flex-1 min-h-0 bg-[var(--app-bg)]" />}
    </div>
  );

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full min-h-0 overflow-hidden touch-none bg-[var(--app-bg)]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div
        className="absolute left-0 right-0 top-0 flex flex-col ease-out [backface-visibility:hidden]"
        style={{
          height: slotH > 0 ? slotH * 3 : '300%',
          transform: `translate3d(0, ${translateY}px, 0)`,
          transition:
            transitionMs > 0 ? `transform ${transitionMs}ms cubic-bezier(0.25, 0.8, 0.25, 1)` : 'none',
          willChange: transitionMs > 0 ? 'transform' : 'auto',
        }}
      >
        {slot(prevCard, 'prev')}
        {slot(currentCard, 'current')}
        {slot(nextCard, 'next')}
      </div>
    </div>
  );
}
