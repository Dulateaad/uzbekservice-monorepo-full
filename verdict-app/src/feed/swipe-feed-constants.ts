/** 40 карточек-пар назад (не картинок) */
export const FEED_PAST_MAX = 40;
/** Целевой буфер вперёд — карточек-пар */
export const FEED_FUTURE_TARGET = 40;
/** Старт: 1 current + 40 future */
export const FEED_INIT_BATCH = 41;
/** Догрузка пачкой */
export const FEED_FETCH_CHUNK = 30;
/** Порог догрузки */
export const FEED_FUTURE_LOW_WATER = 15;
/** Защита от раздувания future после swipePrev */
export const FEED_FUTURE_HARD_MAX = 45;

export const SWIPE_DISTANCE_THRESHOLD_PX = 72;
export const SWIPE_VELOCITY_THRESHOLD = 0.35;

/** Длительность CSS-свайпа до commit past/current/future (мс) */
export const SWIPE_ANIMATION_MS = 280;
