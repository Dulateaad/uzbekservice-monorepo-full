# 📡 Click Payment - Описание API Endpoints

## ⚠️ Важно понимать

Эти URL **не являются обычными веб-страницами**. Это **API endpoints**, которые:
- Принимают **POST запросы** с JSON данными
- Возвращают **JSON ответы**
- Используются для интеграции с платежной системой Click

---

## 🔗 Endpoints

### 1. **clickPrepare** - Подготовка платежа

**URL:** `https://us-central1-odo-uz-app.cloudfunctions.net/clickPrepare`

#### Что происходит при переходе в браузере:
Если вы просто откроете эту ссылку в браузере (GET запрос), вы получите:
```json
{
  "error": "Method not allowed"
}
```
**Статус:** 405 (Method Not Allowed)

#### Правильное использование (POST запрос):
```bash
curl -X POST https://us-central1-odo-uz-app.cloudfunctions.net/clickPrepare \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER123",
    "amount": 50000,
    "userId": "user123"
  }'
```

#### Успешный ответ:
```json
{
  "paymentUrl": "https://my.click.uz/services/pay?service_id=84238&merchant_id=46893&...",
  "transactionId": "TXN1766669058580969863"
}
```

#### Ошибки:
- **400 Bad Request:** Отсутствуют обязательные поля
  ```json
  {
    "error": "Missing required fields: orderId, amount, userId"
  }
  ```
- **500 Internal Server Error:** Конфигурация не настроена
  ```json
  {
    "error": "Click configuration not set"
  }
  ```

---

### 2. **clickComplete** - Подтверждение платежа

**URL:** `https://us-central1-odo-uz-app.cloudfunctions.net/clickComplete`

#### Что происходит при переходе в браузере:
```json
{
  "error": "Method not allowed"
}
```
**Статус:** 405 (Method Not Allowed)

#### Правильное использование:
Этот endpoint вызывается **Click системой** автоматически после оплаты. Он не предназначен для прямого вызова из браузера.

**Параметры от Click:**
- `click_trans_id` - ID транзакции Click
- `merchant_trans_id` - ID заказа мерчанта
- `amount` - Сумма платежа
- `action` - Действие (обычно "1")
- `sign_time` - Время подписи
- `sign_string` - Подпись для проверки
- `error` - Код ошибки (0 = успех)
- `error_note` - Описание ошибки

#### Успешный ответ:
```json
{
  "error": "0",
  "error_note": "Success"
}
```

---

### 3. **clickWebhook** - Webhook для уведомлений

**URL:** `https://us-central1-odo-uz-app.cloudfunctions.net/clickWebhook`

#### Что происходит при переходе в браузере:
```json
{
  "error": "Method not allowed"
}
```
**Статус:** 405 (Method Not Allowed)

#### Правильное использование:
Этот endpoint вызывается **Click системой** автоматически для отправки уведомлений о статусе платежа. Он не предназначен для прямого вызова из браузера.

**Параметры:** Те же, что и у `clickComplete`

#### Успешный ответ:
```json
{
  "success": true
}
```

---

## 🧪 Тестирование endpoints

### Тест clickPrepare (работает):
```bash
curl -X POST https://us-central1-odo-uz-app.cloudfunctions.net/clickPrepare \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test123",
    "amount": 1000,
    "userId": "test_user"
  }'
```

**Ожидаемый результат:**
```json
{
  "paymentUrl": "https://my.click.uz/services/pay?service_id=84238&merchant_id=46893&transaction_param=test123&amount=1000&action=1&sign_time=...&sign_string=...&click_trans_id=TXN...",
  "transactionId": "TXN..."
}
```

### Тест clickComplete (требует подпись от Click):
Этот endpoint нельзя протестировать напрямую, так как он требует валидную подпись от Click системы.

---

## 📋 Что происходит в процессе оплаты:

1. **Клиент создает заказ** → Приложение вызывает `clickPrepare` с данными заказа
2. **clickPrepare создает транзакцию** → Сохраняет в Firestore и возвращает `paymentUrl`
3. **Клиент переходит по paymentUrl** → Открывается страница оплаты Click
4. **Клиент оплачивает** → Click обрабатывает платеж
5. **Click вызывает clickComplete** → Подтверждает платеж на сервере
6. **Click вызывает clickWebhook** → Отправляет уведомление о статусе
7. **Статус обновляется** → В Firestore обновляется статус заказа и платежа

---

## 🔍 Проверка работы endpoints

### Через браузер (неправильно, но для проверки):
Просто откройте ссылку в браузере - вы увидите ошибку "Method not allowed", что означает, что endpoint работает, но требует POST запрос.

### Через curl (правильно):
```bash
# Проверка clickPrepare
curl -X POST https://us-central1-odo-uz-app.cloudfunctions.net/clickPrepare \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test","amount":1000,"userId":"test"}'
```

### Через Postman/Insomnia:
1. Метод: **POST**
2. URL: `https://us-central1-odo-uz-app.cloudfunctions.net/clickPrepare`
3. Headers: `Content-Type: application/json`
4. Body (JSON):
   ```json
   {
     "orderId": "ORDER123",
     "amount": 50000,
     "userId": "user123"
   }
   ```

---

## ✅ Выводы

1. **Эти URL не открываются как обычные страницы** - это API endpoints
2. **clickPrepare** можно тестировать напрямую через POST запрос
3. **clickComplete и clickWebhook** вызываются автоматически Click системой
4. **Все endpoints работают** - ошибка "Method not allowed" при GET запросе это нормально
5. **Для реальной оплаты** используется `paymentUrl`, который возвращает `clickPrepare`

---

## 🎯 Что делать дальше:

1. ✅ Endpoints настроены и работают
2. ✅ Настройте URL в личном кабинете Click (my.click.uz)
3. ✅ Протестируйте через приложение - создайте заказ и попробуйте оплатить

**Важно:** После настройки URL в Click, система будет автоматически вызывать `clickComplete` и `clickWebhook` при оплате.

