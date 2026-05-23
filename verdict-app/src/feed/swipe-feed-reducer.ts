import type { VerdictCard } from '@/types/card';
import {
  FEED_FETCH_CHUNK,
  FEED_FUTURE_HARD_MAX,
  FEED_FUTURE_LOW_WATER,
  FEED_INIT_BATCH,
  FEED_PAST_MAX,
} from '@/feed/swipe-feed-constants';

export type SwipeFeedPhase = 'idle' | 'animating_next' | 'animating_prev';

export interface SwipeFeedState {
  past: VerdictCard[];
  current: VerdictCard | null;
  future: VerdictCard[];
  /** Локальный пул ещё не попавший в future (без сети в момент свайпа) */
  pool: VerdictCard[];
  phase: SwipeFeedPhase;
  isFetching: boolean;
  fetchError: boolean;
  initError: boolean;
  /** После исчерпания pool можно ещё раз дернуть getCards */
  hasMoreRemote: boolean;
}

const initialState: SwipeFeedState = {
  past: [],
  current: null,
  future: [],
  pool: [],
  phase: 'idle',
  isFetching: false,
  fetchError: false,
  initError: false,
  hasMoreRemote: true,
};

function dedupeById(cards: VerdictCard[], exclude: Set<string>): VerdictCard[] {
  const out: VerdictCard[] = [];
  for (const c of cards) {
    if (!exclude.has(c.id)) {
      exclude.add(c.id);
      out.push(c);
    }
  }
  return out;
}

export type SwipeFeedAction =
  | { type: 'RESET' }
  | { type: 'INIT_FROM_LIST'; items: VerdictCard[]; error?: boolean }
  | { type: 'COMMIT_NEXT' }
  | { type: 'COMMIT_NEXT_AND_REFILL' }
  | { type: 'COMMIT_PREV' }
  | { type: 'PHASE'; phase: SwipeFeedPhase }
  | { type: 'REFILL_FROM_POOL' }
  | { type: 'APPEND_POOL'; items: VerdictCard[]; loadedIds: Set<string> }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_DONE'; ok: boolean }
  | { type: 'SET_HAS_MORE'; hasMore: boolean }
  | { type: 'UPDATE_CURRENT_CARD'; card: VerdictCard };

export function getSwipeFeedInitialState(): SwipeFeedState {
  return { ...initialState };
}

export function swipeFeedReducer(state: SwipeFeedState, action: SwipeFeedAction): SwipeFeedState {
  switch (action.type) {
    case 'RESET':
      return { ...initialState };
    case 'INIT_FROM_LIST': {
      if (action.error || action.items.length === 0) {
        return {
          ...initialState,
          initError: !!action.error || action.items.length === 0,
          current: null,
        };
      }
      const seen = new Set<string>();
      const items = action.items.filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      const current = items[0] ?? null;
      const future = items.slice(1, FEED_INIT_BATCH);
      const pool = items.slice(FEED_INIT_BATCH);
      return {
        ...initialState,
        current,
        future,
        pool,
        hasMoreRemote: pool.length > 0,
        initError: false,
      };
    }
    case 'PHASE':
      return { ...state, phase: action.phase };
    case 'COMMIT_NEXT': {
      if (!state.current) return state;
      const past = [...state.past, state.current];
      if (past.length > FEED_PAST_MAX) past.shift();
      const nextCurrent = state.future[0] ?? null;
      const future = state.future.slice(1);
      return {
        ...state,
        past,
        current: nextCurrent,
        future,
        phase: 'idle',
      };
    }
    case 'COMMIT_NEXT_AND_REFILL': {
      const s1 = swipeFeedReducer(state, { type: 'COMMIT_NEXT' });
      return swipeFeedReducer(s1, { type: 'REFILL_FROM_POOL' });
    }
    case 'COMMIT_PREV': {
      if (!state.current || state.past.length === 0) return state;
      let future = state.future;
      if (!future.some(c => c.id === state.current!.id)) {
        future = [state.current, ...future];
      }
      if (future.length > FEED_FUTURE_HARD_MAX) {
        future = future.slice(0, FEED_FUTURE_HARD_MAX);
      }
      const past = state.past.slice(0, -1);
      const current = state.past[state.past.length - 1] ?? null;
      return {
        ...state,
        past,
        current,
        future,
        phase: 'idle',
      };
    }
    case 'REFILL_FROM_POOL': {
      if (state.future.length >= FEED_FUTURE_LOW_WATER || state.pool.length === 0) return state;
      const need = FEED_FETCH_CHUNK;
      const take = Math.min(need, state.pool.length);
      const add = state.pool.slice(0, take);
      const pool = state.pool.slice(take);
      return {
        ...state,
        future: [...state.future, ...add],
        pool,
        hasMoreRemote: pool.length > 0,
      };
    }
    case 'APPEND_POOL': {
      const fresh = dedupeById(action.items, action.loadedIds);
      const pool = [...state.pool, ...fresh];
      return {
        ...state,
        pool,
        hasMoreRemote: fresh.length > 0,
        fetchError: false,
      };
    }
    case 'FETCH_START':
      return { ...state, isFetching: true, fetchError: false };
    case 'FETCH_DONE':
      return { ...state, isFetching: false, fetchError: !action.ok };
    case 'SET_HAS_MORE':
      return { ...state, hasMoreRemote: action.hasMore };
    case 'UPDATE_CURRENT_CARD':
      if (!state.current || state.current.id !== action.card.id) return state;
      return { ...state, current: action.card };
    default:
      return state;
  }
}

export function shouldRefillFuture(state: SwipeFeedState): boolean {
  return state.future.length < FEED_FUTURE_LOW_WATER && state.pool.length > 0;
}

export function canSwipeNext(state: SwipeFeedState): boolean {
  return state.phase === 'idle' && !!state.current && state.future.length > 0;
}

export function canSwipePrev(state: SwipeFeedState): boolean {
  return state.phase === 'idle' && !!state.current && state.past.length > 0;
}

export function getVisibleSlots(state: SwipeFeedState): {
  prev: VerdictCard | null;
  curr: VerdictCard | null;
  next: VerdictCard | null;
} {
  const prev = state.past[state.past.length - 1] ?? null;
  return { prev, curr: state.current, next: state.future[0] ?? null };
}

