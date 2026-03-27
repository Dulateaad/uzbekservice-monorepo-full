# 🔄 Как работает функция отправки в Telegram

## 📋 Полный flow работы:

### 1. Продавец нажимает "Вызвать курьера"

**Экран:** `SellerOrdersScreen` (`lib/screens/bookstore/seller_orders_screen.dart`)

```dart
// Когда продавец нажимает кнопку "Вызвать курьера"
Future<void> _callCourier(BookOrder order) async {
  // 1. Показываем диалог подтверждения
  final confirmed = await showDialog<bool>(...);
  
  // 2. Вызываем TelegramService
  final success = await TelegramService().sendCourierRequest(
    orderId: order.id,
    bookTitle: order.bookTitle,
    bookAuthor: order.bookAuthor,
    bookPrice: order.bookPrice,
    parentName: order.parentName ?? 'Не указано',
    parentPhone: order.parentPhone ?? 'Не указано',
    deliveryAddress: order.deliveryAddress ?? 'Не указано',
    deliveryNotes: order.deliveryNotes,
    sellerName: order.sellerName ?? 'Не указано',
    sellerPhone: order.sellerPhone ?? 'Не указано',
  );
  
  // 3. Обновляем статус заказа
  if (success) {
    order.status = 'courier_called';
  }
}
```

---

### 2. TelegramService форматирует сообщение

**Файл:** `lib/services/telegram_service.dart`

```dart
Future<bool> sendCourierRequest({...}) async {
  // 1. Форматируем сообщение
  final message = _formatCourierMessage(...);
  
  // 2. Отправляем POST запрос на Firebase Function
  final response = await http.post(
    Uri.parse('https://us-central1-anama-app.cloudfunctions.net/sendTelegramMessage'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'message': message,  // Отформатированное сообщение
      'orderId': orderId,
    }),
  );
  
  // 3. Возвращаем результат
  return response.statusCode == 200;
}
```

**Формат сообщения:**
```
🚚 ВЫЗОВ КУРЬЕРА

📦 Заказ #order1

📚 Книга:
Алиса в Стране Чудес
Автор: Льюис Кэрролл
Цена: 25000 сум

👤 Покупатель:
Имя: Алишер Усманов
Телефон: +998901234567

📍 Адрес доставки:
г. Ташкент, ул. Навои, д. 15, кв. 42

📝 Примечания:
Позвонить за 10 минут до приезда

🏪 Продавец:
Книжный магазин "Читай-Город"
Телефон: +998901111111

⏰ Время: 2025-12-25 15:30:00
```

---

### 3. Firebase Function получает запрос

**Файл:** `functions/src/index.ts`

```typescript
export const sendTelegramMessage = functions.https.onRequest(async (req, res) => {
  // 1. Проверяем метод запроса
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // 2. Извлекаем данные из запроса
  const { message, orderId } = req.body;

  // 3. Получаем конфигурацию из Firebase Config
  const TELEGRAM_BOT_TOKEN = functions.config().telegram?.bot_token;
  const TELEGRAM_CHAT_ID = functions.config().telegram?.chat_id;

  // 4. Отправляем сообщение в Telegram через Bot API
  const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const telegramResponse = await axios.post(telegramApiUrl, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown',
  });

  // 5. Возвращаем результат клиенту
  if (telegramResponse.data.ok) {
    res.json({
      success: true,
      messageId: telegramResponse.data.result.message_id,
      orderId: orderId,
    });
  }
});
```

---

### 4. Telegram Bot API отправляет сообщение

**Что происходит:**
1. Firebase Function делает POST запрос на `https://api.telegram.org/bot<TOKEN>/sendMessage`
2. Telegram API получает запрос с:
   - `chat_id` - куда отправить (ваш Chat ID)
   - `text` - текст сообщения
   - `parse_mode` - форматирование (Markdown)
3. Telegram отправляет сообщение в указанный чат/группу/канал

---

## 🔄 Полная схема работы:

```
┌─────────────────┐
│   Продавец      │
│  (в приложении) │
└────────┬────────┘
         │
         │ 1. Нажимает "Вызвать курьера"
         ▼
┌─────────────────────────┐
│  SellerOrdersScreen      │
│  _callCourier()         │
└────────┬────────────────┘
         │
         │ 2. Вызывает TelegramService
         ▼
┌─────────────────────────┐
│  TelegramService         │
│  sendCourierRequest()    │
│  - Форматирует сообщение │
│  - Отправляет POST       │
└────────┬────────────────┘
         │
         │ 3. HTTP POST запрос
         │    https://us-central1-anama-app.cloudfunctions.net/sendTelegramMessage
         ▼
┌─────────────────────────┐
│  Firebase Function       │
│  sendTelegramMessage     │
│  - Получает данные       │
│  - Читает конфигурацию   │
│  - Отправляет в Telegram │
└────────┬────────────────┘
         │
         │ 4. HTTP POST запрос
         │    https://api.telegram.org/bot<TOKEN>/sendMessage
         ▼
┌─────────────────────────┐
│  Telegram Bot API        │
│  - Проверяет токен       │
│  - Отправляет сообщение  │
└────────┬────────────────┘
         │
         │ 5. Сообщение доставлено
         ▼
┌─────────────────────────┐
│  Telegram чат/группа     │
│  (ваш Chat ID)           │
│  📱 Получает сообщение    │
└─────────────────────────┘
```

---

## 📝 Детальный разбор каждого шага:

### Шаг 1: Продавец нажимает кнопку

**Где:** `lib/screens/bookstore/seller_orders_screen.dart`

```dart
// Кнопка появляется только если:
if (order.canCallCourier && !order.isCourierCalled) {
  // order.canCallCourier = status == 'ready' || status == 'preparing'
  DesignSystemButton(
    text: '🚚 Вызвать курьера',
    onPressed: () => _callCourier(order),
  );
}
```

**Что происходит:**
- Проверяется статус заказа (`ready` или `preparing`)
- Показывается диалог подтверждения
- После подтверждения вызывается `TelegramService`

---

### Шаг 2: Форматирование сообщения

**Где:** `lib/services/telegram_service.dart`

```dart
String _formatCourierMessage({...}) {
  final buffer = StringBuffer();
  buffer.writeln('🚚 *ВЫЗОВ КУРЬЕРА*');
  buffer.writeln('📦 *Заказ #$orderId*');
  // ... форматирование всех данных
  return buffer.toString();
}
```

**Что происходит:**
- Собираются все данные заказа
- Форматируется красивое сообщение с эмодзи
- Используется Markdown для форматирования (`*текст*` = жирный)

---

### Шаг 3: Отправка на Firebase Function

**HTTP запрос:**
```http
POST https://us-central1-anama-app.cloudfunctions.net/sendTelegramMessage
Content-Type: application/json

{
  "message": "🚚 ВЫЗОВ КУРЬЕРА\n\n📦 Заказ #order1\n...",
  "orderId": "order1"
}
```

**Ответ:**
```json
{
  "success": true,
  "messageId": 123,
  "orderId": "order1"
}
```

---

### Шаг 4: Firebase Function обрабатывает запрос

**Что делает функция:**

1. **Проверяет метод:** Только POST
2. **Извлекает данные:** `message` и `orderId` из body
3. **Читает конфигурацию:**
   ```typescript
   const TELEGRAM_BOT_TOKEN = functions.config().telegram?.bot_token;
   const TELEGRAM_CHAT_ID = functions.config().telegram?.chat_id;
   ```
4. **Отправляет в Telegram:**
   ```typescript
   await axios.post('https://api.telegram.org/bot<TOKEN>/sendMessage', {
     chat_id: TELEGRAM_CHAT_ID,
     text: message,
     parse_mode: 'Markdown',
   });
   ```

---

### Шаг 5: Telegram получает и отправляет сообщение

**Telegram Bot API запрос:**
```http
POST https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/sendMessage
Content-Type: application/json

{
  "chat_id": "987654321",
  "text": "🚚 ВЫЗОВ КУРЬЕРА\n\n...",
  "parse_mode": "Markdown"
}
```

**Telegram API ответ:**
```json
{
  "ok": true,
  "result": {
    "message_id": 123,
    "date": 1234567890,
    "chat": {...},
    "text": "..."
  }
}
```

---

## ⚙️ Конфигурация:

### Firebase Functions Config:

```bash
# Установка конфигурации
firebase functions:config:set telegram.bot_token="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
firebase functions:config:set telegram.chat_id="987654321"

# Просмотр конфигурации
firebase functions:config:get

# Результат:
# {
#   "telegram": {
#     "bot_token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
#     "chat_id": "987654321"
#   }
# }
```

---

## 🔒 Безопасность:

1. **Bot Token** хранится в Firebase Config (не в коде клиента)
2. **Chat ID** хранится в Firebase Config
3. **Функция проверяет** наличие конфигурации перед отправкой
4. **CORS** настроен для разрешения запросов от клиента

---

## 🧪 Тестирование:

### 1. Тест через curl:

```bash
curl -X POST https://us-central1-anama-app.cloudfunctions.net/sendTelegramMessage \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Тестовое сообщение",
    "orderId": "test123"
  }'
```

### 2. Тест через приложение:

1. Откройте приложение
2. Перейдите в `/bookstore/seller/orders`
3. Выберите заказ со статусом `ready`
4. Нажмите "Вызвать курьера"
5. Проверьте Telegram - должно прийти сообщение

---

## 📊 Обработка ошибок:

### Если Bot Token не настроен:
```json
{
  "error": "Telegram bot not configured"
}
```

### Если Chat ID неверный:
```json
{
  "ok": false,
  "error_code": 400,
  "description": "Bad Request: chat not found"
}
```

### Если сообщение слишком длинное:
Telegram ограничивает сообщения до 4096 символов. Функция вернет ошибку от Telegram API.

---

## ✅ Итог:

**Функция работает так:**

1. **Клиент** (приложение) → отправляет данные заказа
2. **Firebase Function** → получает, форматирует, отправляет в Telegram
3. **Telegram Bot API** → доставляет сообщение в указанный чат
4. **Вы** → получаете сообщение в Telegram с данными заказа

**Вся логика на сервере** - безопасно и надежно! 🔒

