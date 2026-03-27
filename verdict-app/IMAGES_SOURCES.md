# Источники картинок (без Vertex AI)

Архитектура: **объект** (`verdict_objects`) — одна картинка + подпись. **Карточка** — два объекта (`objectIdA`, `objectIdB`) + текст `optionA` / `optionB`.

## Рекомендуется

1. **Wikimedia Commons** — бесплатно, указать лицензию в `externalRef` (имя файла).
2. **Unsplash API** — бесплатный tier, ключ в `.env`: `UNSPLASH_ACCESS_KEY` (для будущих скриптов).
3. Ручные URL в seed: `scripts/lib/seed-objects-data.ts`.

## Seed

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:objects
```

Полная замена коллекций (осторожно):

```bash
npm run seed:objects:replace
```

## Telegram Mini App: картинки не грузятся (чёрные плитки, «битый» значок)

Прямые ссылки на **upload.wikimedia.org** часто получают **HTTP 429** (лимит по IP) в WebView Telegram и на мобильных сетях — запросы с приложения выглядят как массовый hotlink.

**Решение:** один раз зеркалировать файлы в **Firebase Storage** и обновить URL в Firestore:

1. Firebase Console → **Storage** → включить (если ещё нет).
2. В `.env` задать актуальный бакет, например `VITE_FIREBASE_STORAGE_BUCKET=verdict-c5e0d.firebasestorage.app` (см. настройки проекта).
3. Задеплоить правила Storage: `npm run deploy:storage` (или полный `firebase deploy`).
4. Запустить зеркалирование (нужен service account с правами Storage + Firestore):

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run mirror:images
```

Скрипт качает URL из `scripts/lib/seed-objects-data.ts`, заливает в `verdict-objects/{id}.*`, обновляет `verdict_objects` и денормализованные `imageA`/`imageB` в `verdict_cards`.

В приложении: `<meta name="referrer" content="no-referrer">`, `referrerPolicy="no-referrer"` на `<img>` и fallback на градиент при `onError`.

## Устарело

`npm run generate:images` — Vertex AI / Imagen (платно, требует биллинг GCP). Для новых проектов не используйте; обновляйте объекты через seed или Unsplash/Commons.
