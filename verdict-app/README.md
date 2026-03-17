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

## 4. Загрузка карточек

Через Admin SDK (рекомендуется):

1. Firebase Console → verdict-c5e0d → Project Settings → Service Accounts → Generate new private key
2. Сохранить JSON в `service-account.json`
3. Выполнить:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:admin
```

Если в Firestore уже есть карточки, но не хватает разделов (например, «Быстрые»):

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:missing
```

## 5. Запуск

```bash
npm run dev
```

## 6. Генерация картинок для карточек (Vertex AI)

Чтобы у карточек были сгенерированные изображения (поле `imageA` / `imageB`):

1. **Включите Firebase Storage** (иначе будет 404 "bucket does not exist"):
   - Firebase Console → Build → Storage → Get started
   - Имя бакета см. в Project Settings (обычно `verdict-c5e0d.appspot.com` или `verdict-c5e0d.firebasestorage.app`)
   - Если бакет `*.firebasestorage.app`, добавьте в `.env`: `VITE_FIREBASE_STORAGE_BUCKET=verdict-c5e0d.firebasestorage.app`
2. **Включите Vertex AI API** (обязательно, иначе будет 403):
   - Через консоль: [Enable Vertex AI API](https://console.developers.google.com/apis/api/aiplatform.googleapis.com/overview?project=verdict-c5e0d) → Enable
   - Или через gcloud: `gcloud services enable aiplatform.googleapis.com --project=verdict-c5e0d`
3. Убедитесь, что в проекте включён **биллинг** (Vertex AI платный).
4. Авторизация: `gcloud auth application-default login` или положите ключ сервисного аккаунта и задайте `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json`.
5. Запустите скрипт (генерирует картинки через Imagen 3, заливает в Storage):

```bash
npm run generate:images
```

Перегенерация всех картинок (новый промпт/качество):

```bash
npm run generate:images:force
```

Промпт: качественные иллюстрации без текста, полный кадр без обрезки.

## 7. Деплой

```bash
npm run deploy
```

URL: `https://verdict-c5e0d.web.app`

## 8. Telegram

1. [@BotFather](https://t.me/botfather) → создать бота
2. Bot Settings → Configure Mini App → URL вашего Hosting
