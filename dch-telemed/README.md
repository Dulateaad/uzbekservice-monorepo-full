# DCH Telemed MVP

Отдельный скелет продукта: **Firebase** (Firestore, Auth, Functions, Hosting) + **Daily.co** для видео, веб врача на **Vue 2.7**, страница пациента **Vite + TypeScript**.

## Структура

| Путь | Назначение |
|------|------------|
| [functions/](functions/) | Cloud Functions v2, Express: `dchApi` |
| [doctor-app/](doctor-app/) | Vue 2 — split-screen видео + заглушка ЭМК |
| [patient-join/](patient-join/) | Мини SPA — `?g=` → токен → iframe Daily |
| [docs/](docs/) | OpenAPI, приёмка |

## Быстрый старт

1. [ENV_SETUP.md](ENV_SETUP.md) — проект Firebase, секреты, CORS (`ALLOWED_ORIGINS`).
2. Установите targets для двух Hosting-сайтов или измените [firebase.json](firebase.json) под один сайт.
3. Создайте запись вручную в Firestore `appointments`:

```text
type: "online_consultation"
doctorId: "<firebase auth uid врача>"
status: "scheduled"
scheduledStart: <Timestamp>
scheduledEnd: <Timestamp>
patientPhone: "+77001234567"
patientName: "Тест"
```

Создание документов с клиента запрещено правилами — используйте консоль или Admin SDK.

4. Деплой функций: из корня `dch-telemed` выполните `firebase deploy --only functions` (после `firebase login` и смены project id).

5. Сборка фронтов:

```bash
cd doctor-app && npm ci && npm run build
cd ../patient-join && npm ci && npm run build
```

6. Деплой хостинга: `firebase deploy --only hosting`.

## API

См. [docs/openapi.yaml](docs/openapi.yaml). Ключевые маршруты:

- `POST .../appointments/:id/video/prepare` — JWT врача.
- `POST .../video/token` — врач или пациент (с `grantId`).
- `POST .../video/token-by-grant` — только `grantId` (страница пациента).
- `POST .../notify/appointment-link` — `X-Internal-Key`, создаёт ссылку и шлёт в мессенджер (если настроен).
- `POST .../webhooks/daily` — подпись Daily.

## Локальная разработка

- Functions: [functions/.env.local](functions/.env.local) с `DAILY_*`, `INTERNAL_NOTIFY_KEY`, `ALLOWED_ORIGINS`, при необходимости `ALLOW_INSECURE_WEBHOOK=1`, `MESSAGING_*`.
- Эмулятор: `npm --prefix functions run build && firebase emulators:start --only functions` из `dch-telemed`.
- Фронты: `npm run dev` в `doctor-app` (порт 5174) и `patient-join` (5173); в `.env` укажите URL эмулятора функций.

## Интеграция ЭМК

Замените блок «ЭМК» в [doctor-app/src/views/ConsultationView.vue](doctor-app/src/views/ConsultationView.vue) на iframe или компонент вашего модуля DCH.
