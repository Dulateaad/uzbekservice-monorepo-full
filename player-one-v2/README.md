# Player One v2 — Firebase + Cloud Run

Монорепозиторий фронта (**Next.js 14**) для проекта Player One по [`docs/TZ_PlayerOne_v2_Firebase_CloudRun.md`](../docs/TZ_PlayerOne_v2_Firebase_CloudRun.md).

## Что реализовано

- **`firebase.json`** + **`.firebaserc`** — Hosting с `rewrites` на сервис Cloud Run `player-one-api` (`us-central1`).
- **Next.js `output: 'export'`** — статический вывод в `apps/web/out` для деплоя на Hosting.
- **Firebase Auth (Google)** + **Storage**: загрузка видео в `uploads/{uid}/…`, затем **`POST /api/analyze-video-storage`** с Firebase ID token.
- **Клиент API** — `lib/player-one-api.ts` (`NEXT_PUBLIC_PLAYER_ONE_API_URL` пустой = тот же origin после деплоя).
- **Дашборд** — опрос статуса задачи по query `?jobId=` (`GET /api/analysis-status/:id`).

## Настройка

1. Скопируйте `apps/web/.env.example` → `apps/web/.env.local` и заполните ключи из Firebase Console → Project settings.
2. Убедитесь, что в Firebase включены **Google** sign-in и **Storage**.
3. Загрузите правила Storage (пример — `storage.rules.example`): пользователь пишет только в `uploads/{uid}/**`.

```bash
firebase deploy --only storage
```

## Сборка и деплой Hosting

Из каталога **`player-one-v2`**:

```bash
chmod +x deploy-hosting.sh
./deploy-hosting.sh
```

Вручную:

```bash
cd apps/web && npm ci && npm run build && cd ../..
firebase deploy --only hosting
```

Перед первым деплоем свяжите Hosting с Cloud Run в консоли Firebase или убедитесь, что сервис **`player-one-api`** существует в **`us-central1`** (как в `firebase.json`).

## Локальная разработка

```bash
cd apps/web
cp .env.example .env.local   # заполнить
npm install
npm run dev
```

Для вызова API с localhost задайте прямой URL API:

```env
NEXT_PUBLIC_PLAYER_ONE_API_URL=https://player-one-api-xxxxx-us-central1.run.app
```

И добавьте этот origin в **`CORS_ORIGINS`** на Cloud Run (`player-one-api`).

## Структура

```
player-one-v2/
  firebase.json
  .firebaserc
  deploy-hosting.sh
  storage.rules.example
  apps/web/          # Next.js → out/
```
