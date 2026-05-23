# Переменные окружения DCH Telemed

## Firebase

1. Создайте проект в [Firebase Console](https://console.firebase.google.com).
2. Включите **Authentication** (Email/пароль или провайдер по выбору), **Firestore**, **Functions**, **Hosting** (два сайта).
3. Замените `your-dch-firebase-project` в [.firebaserc](.firebaserc).
4. Создайте два Hosting target (или два дефолтных сайта) и пропишите в [.firebaserc](.firebaserc) через:

```bash
firebase target:apply hosting dch-patient-join YOUR_JOIN_SITE_ID
firebase target:apply hosting dch-doctor YOUR_DOCTOR_SITE_ID
```

## Секреты Cloud Functions (Secret Manager)

Обязательные секреты (см. [functions/src/index.ts](functions/src/index.ts)):

```bash
cd functions
firebase functions:secrets:set DAILY_API_KEY
firebase functions:secrets:set DAILY_WEBHOOK_HMAC_BASE64
firebase functions:secrets:set INTERNAL_NOTIFY_KEY
```

- **DAILY_API_KEY** — ключ из [Daily Dashboard](https://dashboard.daily.co/developers).
- **DAILY_WEBHOOK_HMAC_BASE64** — значение поля `hmac` из ответа `POST https://api.daily.co/v1/webhooks` после регистрации URL `https://<region>-<project>.cloudfunctions.net/dchApi/webhooks/daily`.
- **INTERNAL_NOTIFY_KEY** — общий секрет для заголовка `X-Internal-Key` на `POST /notify/appointment-link`.

Параметры (необязательно, через `.env` в каталоге `functions` при деплое или файл `.env.<projectId>` по [доке params](https://firebase.google.com/docs/functions/config-env)):

- **HOSTING_JOIN_ORIGIN** — публичный URL сайта `patient-join` (например `https://dch-join.web.app`).
- **MESSAGING_API_URL**, **MESSAGING_API_KEY** — HTTP-интеграция ChatApp/WhatsApp; если URL пустой, тело сообщения только логируется.

## Локальная эмуляция

Создайте `functions/.env.local` (не коммитьте). Эмулятор подхватывает его при `FUNCTIONS_EMULATOR=true`:

```
DAILY_API_KEY=
DAILY_WEBHOOK_HMAC_BASE64=
INTERNAL_NOTIFY_KEY=dev-notify-secret
HOSTING_JOIN_ORIGIN=http://localhost:5173
MESSAGING_API_URL=
MESSAGING_API_KEY=
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
# Только для отладки webhook без HMAC:
# ALLOW_INSECURE_WEBHOOK=1
```

Для эмулятора Functions v2 с секретами см. [документацию Firebase](https://firebase.google.com/docs/functions/config-env).

## CORS

Дополнительные origin задайте через переменную **ALLOWED_ORIGINS** (через запятую). Базовый список: [functions/src/config.ts](functions/src/config.ts).

## FCM (опционально)

Отправка пушей не входит в минимальный HTTP API; при появлении мобильного клиента подключите Firebase Cloud Messaging в том же проекте и вызывайте из отдельной функции после `notify` или по расписанию.

## Клиентские приложения

- `patient-join/.env` — `VITE_API_BASE_URL` (URL функции `dchApi`, например `https://us-central1-PROJECT.cloudfunctions.net/dchApi`).
- `doctor-app/.env` — `VITE_API_BASE_URL`, `VITE_FIREBASE_*` из настроек проекта (скопировать из Firebase Console → Project settings).
