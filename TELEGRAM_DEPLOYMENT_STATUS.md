# 📊 Статус деплоя Telegram функции

## ✅ Функция задеплоена!

**Функция:** `sendTelegramMessage`  
**Проект:** `anama-app`  
**URL:** `https://us-central1-anama-app.cloudfunctions.net/sendTelegramMessage`  
**Статус:** ✅ Активна  
**Версия:** v1  
**Runtime:** Node.js 20  
**Memory:** 256 MB

---

## ⚙️ Конфигурация:

### Что нужно настроить:

1. **Bot Token** - токен вашего Telegram бота
2. **Chat ID** - ID чата/группы/канала куда отправлять сообщения

### Как настроить:

```bash
# Переключитесь на проект anama-app
firebase use anama-app

# Установите Bot Token
firebase functions:config:set telegram.bot_token="YOUR_BOT_TOKEN"

# Установите Chat ID
firebase functions:config:set telegram.chat_id="YOUR_CHAT_ID"

# Проверьте конфигурацию
firebase functions:config:get
```

### Проверка конфигурации:

```bash
firebase functions:config:get
```

Должно показать:
```json
{
  "telegram": {
    "bot_token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
    "chat_id": "987654321"
  }
}
```

---

## 🧪 Тестирование функции:

### Через curl:

```bash
curl -X POST https://us-central1-anama-app.cloudfunctions.net/sendTelegramMessage \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Тестовое сообщение",
    "orderId": "test123"
  }'
```

### Ожидаемый ответ:

**Если конфигурация настроена:**
```json
{
  "success": true,
  "messageId": 123,
  "orderId": "test123"
}
```

**Если конфигурация не настроена:**
```json
{
  "error": "Telegram bot not configured"
}
```

---

## 📋 Текущий статус:

- ✅ **Функция задеплоена:** `sendTelegramMessage` активна
- ⚠️ **Конфигурация:** Нужно настроить Bot Token и Chat ID
- ✅ **Код готов:** Функция работает корректно

---

## 🔧 Следующие шаги:

1. **Получите Bot Token:**
   - Откройте [@BotFather](https://t.me/BotFather)
   - Создайте бота или используйте существующего
   - Скопируйте токен

2. **Получите Chat ID:**
   - Напишите боту сообщение
   - Откройте: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Найдите `"chat": {"id": 123456789}`

3. **Настройте конфигурацию:**
   ```bash
   firebase functions:config:set telegram.bot_token="YOUR_TOKEN"
   firebase functions:config:set telegram.chat_id="YOUR_CHAT_ID"
   ```

4. **Протестируйте:**
   - Используйте curl команду выше
   - Или протестируйте через приложение

---

## ✅ Итог:

**Функция задеплоена и готова к работе!**  
Осталось только настроить Bot Token и Chat ID.

