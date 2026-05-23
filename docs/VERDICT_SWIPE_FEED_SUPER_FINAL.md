# Verdict — SUPER FINAL FREEZE (swipe-feed engine)

Полный текст спецификации передан отдельным сообщением в чат (вертикальная лента как TikTok/Reels, past/current/future, 40+40 карточек-пар, DOM prev/current/next, POST /feed, POST /vote, транзакции, переголосование, жесты, 60 FPS).

Клиентская реализация в репозитории (без нового REST API):

- `verdict-app/src/feed/swipe-feed-constants.ts` — лимиты 40/41/30/15/45, пороги жеста.
- `verdict-app/src/feed/swipe-feed-reducer.ts` — модель `past` / `current` / `future` / `pool`, commit после свайпа.
- `verdict-app/src/feed/useSwipeFeed.ts` — инициализация из Firestore `getCards`, догрузка, `loadedIds` / `viewedIds`, commit с `markCardAsSeen`.
- `verdict-app/src/feed/SwipeFeedViewport.tsx` — три слота по высоте экрана, `translateY`, порог дистанции/скорости.

**Бэкенд сейчас:** Firebase (`getCards`, `voteCard`). Нет POST `/feed` с cursor — догрузка эмулируется повторным `getCards` + dedupe по `loadedCardIds`. Переголосование через `voteCard` без upsert на сервере — для полного соответствия FREEZE нужны Cloud Functions / REST по спецификации.

Дальнейшие шаги для разработчика: см. чеклист в исходном SUPER FINAL FREEZE (acceptance criteria §37).
