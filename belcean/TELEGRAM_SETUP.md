# Настройка Telegram для заявок

## Где вписать переменные

### 1. Локальная разработка
Создайте файл `.env.local` в корне проекта belcean:

```
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
TELEGRAM_CHAT_ID=7593008791,второй_id,третий_id
```

### 2. Firebase App Hosting (продакшен)
1. Откройте [Firebase Console](https://console.firebase.google.com)
2. Выберите проект
3. **App Hosting** → ваш backend → **Environment variables**
4. Добавьте:
   - `TELEGRAM_BOT_TOKEN` = токен бота
   - `TELEGRAM_CHAT_ID` = ID чатов через запятую

### 3. Несколько чатов
В `TELEGRAM_CHAT_ID` перечислите ID через запятую **без пробелов**:

```
TELEGRAM_CHAT_ID=7593008791,123456789,987654321
```

Все эти чаты будут получать уведомления о заявках.

## Как получить значения

**Токен бота:** @BotFather → /newbot → скопируйте токен

**Chat ID:** 
1. Напишите боту /start
2. Откройте: `https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates`
3. В ответе найдите `"chat":{"id":7593008791}` — это ваш chat_id
