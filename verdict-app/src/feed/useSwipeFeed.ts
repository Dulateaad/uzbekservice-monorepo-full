import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { VerdictCard } from '@/types/card';
import { getCards, hydrateCardsWithUserVotes } from '@/services/cards-service';
import { getCardsWithVotes } from '@/data/starter-cards';
import { filterSeenCards, markCardAsSeen } from '@/services/seen-cards-service';
import { getBattleOfDayCard } from '@/services/cards-service';
import {
  canSwipeNext as canSwipeNextState,
  canSwipePrev as canSwipePrevState,
  getSwipeFeedInitialState,
  getVisibleSlots,
  shouldRefillFuture,
  swipeFeedReducer,
} from '@/feed/swipe-feed-reducer';
import { prefetchFeedImageHorizon } from '@/feed/prefetch-card-images';

function markFirstView(subsection: string, cardId: string, viewed: Set<string>) {
  if (viewed.has(cardId)) return;
  viewed.add(cardId);
  markCardAsSeen(subsection, cardId);
}

export interface UseSwipeFeedOptions {
  subsection: string;
  initialCard?: VerdictCard | null;
  userGeo?: { country?: string; city?: string };
  /** Для подстановки userVote с Firestore (канонический doc) */
  userId?: string | null;
  /** Если false — лента не инициализируется (напр. режим чемпиона) */
  enabled: boolean;
}

export function useSwipeFeed({ subsection, initialCard, userGeo, userId, enabled }: UseSwipeFeedOptions) {
  const [state, dispatch] = useReducer(swipeFeedReducer, undefined, getSwipeFeedInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const loadedIdsRef = useRef<Set<string>>(new Set());
  const viewedIdsRef = useRef<Set<string>>(new Set());
  const voteVersionRef = useRef<Map<string, number>>(new Map());
  const votingIdsRef = useRef<Set<string>>(new Set());

  const buildList = useCallback(
    async (): Promise<VerdictCard[]> => {
      const battleCard = subsection === 'popular' ? await getBattleOfDayCard() : null;
      const firestoreCards = await getCards(subsection, 220, userGeo);
      let list =
        firestoreCards.length > 0
          ? firestoreCards
          : (() => {
              const fallback = getCardsWithVotes();
              const filtered = subsection ? fallback.filter(c => c.category === subsection) : fallback;
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
      return list;
    },
    [subsection, initialCard?.id, userGeo?.country, userGeo?.city],
  );

  const init = useCallback(async () => {
    if (!enabled) return;
    loadedIdsRef.current = new Set();
    viewedIdsRef.current = new Set();
    dispatch({ type: 'RESET' });
    try {
      let list = await buildList();
      list = await hydrateCardsWithUserVotes(userId ?? null, list);
      list.forEach(c => loadedIdsRef.current.add(c.id));
      dispatch({ type: 'INIT_FROM_LIST', items: list });
      if (list[0]) markFirstView(subsection, list[0].id, viewedIdsRef.current);
      prefetchFeedImageHorizon(list.slice(0, 14));
    } catch {
      dispatch({ type: 'INIT_FROM_LIST', items: [], error: true });
    }
  }, [enabled, buildList, subsection, userId]);

  useEffect(() => {
    void init();
  }, [init]);

  const commitNextAfterSwipe = useCallback(() => {
    const cur = stateRef.current.current;
    if (cur) markCardAsSeen(subsection, cur.id);
    const entering = stateRef.current.future[0];
    dispatch({ type: 'COMMIT_NEXT_AND_REFILL' });
    if (entering) markFirstView(subsection, entering.id, viewedIdsRef.current);
  }, [subsection]);

  const commitPrevAfterSwipe = useCallback(() => {
    dispatch({ type: 'COMMIT_PREV' });
  }, []);

  const fetchMoreRemote = useCallback(async () => {
    if (!enabled || state.isFetching || !state.hasMoreRemote) return;
    dispatch({ type: 'FETCH_START' });
    try {
      const list = await buildList();
      let fresh = list.filter(c => !loadedIdsRef.current.has(c.id));
      fresh = await hydrateCardsWithUserVotes(userId ?? null, fresh);
      fresh.forEach(c => loadedIdsRef.current.add(c.id));
      dispatch({ type: 'APPEND_POOL', items: fresh, loadedIds: loadedIdsRef.current });
      dispatch({ type: 'FETCH_DONE', ok: true });
      if (fresh.length === 0) dispatch({ type: 'SET_HAS_MORE', hasMore: false });
    } catch {
      dispatch({ type: 'FETCH_DONE', ok: false });
    }
  }, [enabled, state.isFetching, state.hasMoreRemote, buildList, userId]);

  useEffect(() => {
    if (!enabled) return;
    if (shouldRefillFuture(stateRef.current)) dispatch({ type: 'REFILL_FROM_POOL' });
  }, [enabled, state.future.length, state.pool.length]);

  useEffect(() => {
    if (!enabled) return;
    if (state.future.length < 15 && state.pool.length === 0 && state.hasMoreRemote && !state.isFetching) {
      void fetchMoreRemote();
    }
  }, [enabled, state.future.length, state.pool.length, state.hasMoreRemote, state.isFetching, fetchMoreRemote]);

  const prevSlotId = state.past[state.past.length - 1]?.id;
  const nextSlotId = state.future[0]?.id;
  const futurePrefetchKey = state.future
    .slice(0, 14)
    .map(c => c.id)
    .join('|');
  const poolPrefetchKey = state.pool
    .slice(0, 8)
    .map(c => c.id)
    .join('|');

  useEffect(() => {
    if (!enabled) return;
    const s = stateRef.current;
    const past = s.past[s.past.length - 1];
    const ahead = s.future.slice(0, 14);
    const poolHead = s.pool.slice(0, 8);
    const horizon: VerdictCard[] = [];
    if (s.current) horizon.push(s.current);
    for (const c of ahead) horizon.push(c);
    if (past) horizon.push(past);
    for (const c of poolHead) {
      if (!horizon.some(x => x.id === c.id)) horizon.push(c);
    }
    prefetchFeedImageHorizon(horizon);
  }, [enabled, state.current?.id, prevSlotId, nextSlotId, futurePrefetchKey, poolPrefetchKey]);

  const registerVoteAttempt = useCallback((cardId: string) => {
    if (votingIdsRef.current.has(cardId)) return null;
    const v = (voteVersionRef.current.get(cardId) ?? 0) + 1;
    voteVersionRef.current.set(cardId, v);
    votingIdsRef.current.add(cardId);
    return v;
  }, []);

  const finishVoteAttempt = useCallback((cardId: string, version: number) => {
    if (voteVersionRef.current.get(cardId) === version) {
      votingIdsRef.current.delete(cardId);
    }
  }, []);

  const applyOptimisticVote = useCallback((card: VerdictCard, choice: 'A' | 'B'): VerdictCard => {
    const vA = card.votesA + (choice === 'A' ? 1 : 0);
    const vB = card.votesB + (choice === 'B' ? 1 : 0);
    const tot = vA + vB;
    return {
      ...card,
      votesA: vA,
      votesB: vB,
      totalVotes: tot,
    };
  }, []);

  const mergeCardIntoState = useCallback((updated: VerdictCard) => {
    dispatch({ type: 'UPDATE_CURRENT_CARD', card: updated });
  }, []);

  return {
    state,
    dispatch,
    loadedIdsRef,
    viewedIdsRef,
    voteVersionRef,
    votingIdsRef,
    init,
    commitNextAfterSwipe,
    commitPrevAfterSwipe,
    fetchMoreRemote,
    registerVoteAttempt,
    finishVoteAttempt,
    applyOptimisticVote,
    mergeCardIntoState,
    getVisibleSlots: () => getVisibleSlots(stateRef.current),
    canSwipeNext: () => canSwipeNextState(stateRef.current),
    canSwipePrev: () => canSwipePrevState(stateRef.current),
    futureEmpty: state.future.length === 0,
  };
}

export type SwipeFeedApi = ReturnType<typeof useSwipeFeed>;
