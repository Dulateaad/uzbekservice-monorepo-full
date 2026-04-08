# PeopleHub Telegram Bot

Telegram бот для мини-приложения такси PeopleHub.

## Деплой на Render

1. Зайди на [render.com](https://render.com) → **New → Background Worker**
2. Подключи репозиторий `Dulateaad/peoplehub-bot`
3. Настройки:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Добавь Environment Variables:
   - `BOT_TOKEN` = ваш токен бота (secret)
   - `WEB_APP_URL` = `https://taxi-eb8b7.web.app`

## Локальная разработка

```bash
cp .env.example .env
# Заполните BOT_TOKEN в .env
npm install
npm run dev
```

## Команды бота

- `/start` — Открыть приложение
- `/help` — Помощь
- `/about` — О платформе
- `/support` — Поддержка
