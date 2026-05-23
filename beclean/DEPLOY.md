# Деплой Beclean

## Архитектура

- **Frontend (Next.js)** → Firebase App Hosting → beclean.uz
- **Backend (Python Flask)** → Google Cloud Run → api.beclean.uz (или xxx.run.app)

---

## 1. Backend на Cloud Run

### Подготовка

```bash
cd beclean
```

### Деплой

```bash
# Создать проект (если ещё нет)
gcloud projects create beclean-xxx --name="Beclean"

# Или использовать существующий
gcloud config set project YOUR_PROJECT_ID

# Включить API
gcloud services enable run.googleapis.com

# Деплой
gcloud run deploy beclean-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

После деплоя получите URL вида: `https://beclean-api-xxxxx-uc.a.run.app`

### Подключить домен api.beclean.uz

1. [Cloud Run Console](https://console.cloud.google.com/run) → ваш сервис → Manage custom domains
2. Добавить `api.beclean.uz`
3. Настроить DNS у регистратора (CNAME или A-записи по инструкции)

---

## 2. Frontend на Firebase App Hosting

### Требования

- Firebase CLI 14.4+
- Blaze план (платный)

### Деплой из репозитория GitHub (рекомендуется)

Сейчас backend можно было поднять только через CLI (загрузка с диска). Чтобы **каждый push в ветку** собирал и выкатывал сайт:

1. Откройте [App Hosting проекта `studio-590355839-601a4`](https://console.firebase.google.com/project/studio-590355839-601a4/apphosting).
2. Выберите backend **`studio`** → **Settings** (шестерёнка) → вкладка **Deployment** (или аналог «Подключение к Git» в мастере).
3. **Connect GitHub** / «Подключить репозиторий», выдайте Firebase доступ к организации/аккаунту GitHub.
4. Укажите репозиторий и **корень приложения** (root directory):
   - репозиторий **`dulateaad/beclean`** → корень **`frontend`** (там Next.js и `apphosting.yaml`);
   - или монорепо **`Dulateaad/uzbekservice_app`** → корень **`beclean/frontend`**.
5. **Live branch** — обычно `main` (или ваша рабочая ветка).
6. Включите автоматические rollouts (по умолчанию включены).

После сохранения новый коммит в live branch запускает сборку в Cloud Build и выкладку на тот же URL (`*.hosted.app` / ваш домен).

`./deploy-apphosting.sh` после этого **не обязателен** — достаточно `git push`. Его можно оставить для срочного выката с ноутбука.

### Настройка (переменные и первичное создание)

1. Если backend ещё нет: [App Hosting](https://console.firebase.google.com/project/_/apphosting) → **Create backend** и сразу подключите GitHub (как выше).

2. **Указать URL бэкенда** в `frontend/apphosting.yaml`:

```yaml
env:
  - variable: NEXT_PUBLIC_API_URL
    value: "https://beclean-api-xxxxx-uc.a.run.app"  # или https://api.beclean.uz
```

3. **Или через Firebase Console**: Backend → Settings → Environment variables → добавить `NEXT_PUBLIC_API_URL`

### Деплой через CLI

```bash
cd beclean
firebase use YOUR_PROJECT_ID   # или beclean проект
firebase deploy --only apphosting:studio
```

### Подключить домен beclean.uz

1. [App Hosting](https://console.firebase.google.com/project/_/apphosting) → ваш backend → Settings → Custom domains
2. Добавить `beclean.uz` и `www.beclean.uz`
3. Настроить DNS по инструкции Firebase

---

## 3. Локальная разработка

### Backend

```bash
cd beclean
pip install -r requirements.txt
python main.py
# API: http://localhost:5000
```

### Frontend

```bash
cd beclean/frontend
cp .env.example .env.local
# В .env.local: NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev
# Сайт: http://localhost:3000
```

---

## Чеклист

- [ ] Backend задеплоен на Cloud Run
- [ ] Домен api.beclean.uz привязан к Cloud Run
- [ ] `NEXT_PUBLIC_API_URL` указан в App Hosting
- [ ] Frontend задеплоен на App Hosting
- [ ] Домен beclean.uz привязан к App Hosting
- [ ] Форма отправляет заявки в Telegram
