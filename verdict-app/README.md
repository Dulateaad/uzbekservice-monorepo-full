# Verdict — Telegram Mini App

Социальная сеть выбора. Формат карточек **A vs B**. Отдельный проект, не связан с ODO.

## 1. Создать Firebase проект

1. [Firebase Console](https://console.firebase.google.com) → Add project → например `verdict`
2. Включить **Firestore**
3. Включить **Hosting**
4. Project Settings → Your apps → Add Web app → скопировать `firebaseConfig`

## 2. Настройка

```bash
cd verdict-app
cp .env.example .env
```

Заполните `.env` из Firebase Console:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_PROJECT_ID=verdict
VITE_FIREBASE_AUTH_DOMAIN=verdict.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=verdict.firebasestorage.app
```

Обновите `.firebaserc` — укажите ваш `projectId`.

## 3. Firestore rules

```bash
npm run deploy:firestore
```

## 4. Загрузка объектов и карточек (рекомендуется)

Архитектура: коллекция **`verdict_objects`** (одна картинка = один объект), **`verdict_cards`** с полями `objectIdA`, `objectIdB` и текстом вариантов. Картинки — **Wikimedia Commons** (бесплатно), без Vertex AI. Подробнее: [IMAGES_SOURCES.md](./IMAGES_SOURCES.md).

1. Service account JSON → `service-account.json`
2. Залить объекты + карточки:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:objects
```

Полная перезапись коллекций `verdict_objects` и `verdict_cards`:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:objects:replace
```

Старый seed без объектов (только текст):

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:admin
```

Добавить недостающие категории:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:missing
```

## 5. Запуск

```bash
npm run dev
```

## 6. Картинки (без Vertex AI)

Используйте `npm run seed:objects` — URL из Wikimedia Commons в `scripts/lib/seed-objects-data.ts`. При желании добавьте **Unsplash API** (бесплатный tier) и подставляйте ссылки в объекты.

Устаревший вариант **Vertex AI / Imagen** (платно, GCP биллинг): `npm run generate:images` — см. комментарий в `scripts/generate-card-images.ts`.

## 7. Деплой

```bash
npm run deploy
```

Правила Storage (после включения Storage в консоли):

```bash
npm run deploy:storage
```

Полный деплой включая Storage: `npm run deploy:all`.

Если в Telegram **не отображаются картинки** с Wikimedia — см. [IMAGES_SOURCES.md](./IMAGES_SOURCES.md) (зеркалирование в Storage: `npm run mirror:images`).

URL: `https://verdict-c5e0d.web.app`

## 8. Telegram

1. [@BotFather](https://t.me/botfather) → создать бота
2. Bot Settings → Configure Mini App → URL вашего Hosting
