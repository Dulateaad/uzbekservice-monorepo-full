# Деплой BeClean на Firebase App Hosting

**Сайт:** https://beclean.uz  
**Firebase URL:** https://studio--studio-590355839-601a4.us-central1.hosted.app

---

## Быстрый деплой (команды)

```bash
cd belcean
firebase use studio-590355839-601a4
firebase deploy --only apphosting
```

---

## Первый раз (если ещё не настроено)

### 1. Установите Firebase CLI

```bash
npm install -g firebase-tools
firebase --version   # должно быть >= 14.4.0
```

### 2. Войдите в Firebase

```bash
firebase login
```

Если сессия истекла — `firebase login --reauth`

### 3. Убедитесь, что проект правильный

```bash
cd belcean
firebase use studio-590355839-601a4
```

### 4. Деплой

```bash
firebase deploy --only apphosting
```

Деплой занимает 5–10 минут.

---

## Переменные окружения (Telegram)

Переменные `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` заданы в **apphosting.yaml** и подхватываются при деплое. При изменении токенов — обновите `apphosting.yaml` и передеплойте.

---

## Альтернатива: GitHub (автодеплой)

Если backend подключён к GitHub:

1. Запушьте изменения в `main`:
   ```bash
   git add .
   git commit -m "Update"
   git push origin main
   ```
2. Firebase автоматически соберёт и задеплоит приложение.
