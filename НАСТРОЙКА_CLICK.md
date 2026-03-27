# Настройка оплаты через Click

## Шаг 1: Регистрация в Click

1. Зарегистрируйтесь как мерчант на [my.click.uz](https://my.click.uz)
2. Получите следующие данные:
   - `merchant_id` - ID мерчанта
   - `service_id` - ID сервиса
   - `secret_key` - Секретный ключ (храните в безопасности!)

## Шаг 2: Настройка Firebase Functions

### Вариант 1: Через Firebase Config (рекомендуется)

```bash
cd /Users/dulatea/uzbekservice_app
firebase functions:config:set click.merchant_id="YOUR_MERCHANT_ID"
firebase functions:config:set click.service_id="YOUR_SERVICE_ID"
firebase functions:config:set click.secret_key="YOUR_SECRET_KEY"
```

### Вариант 2: Через Environment Variables

В файле `functions/.env`:
```
CLICK_MERCHANT_ID=your_merchant_id
CLICK_SERVICE_ID=your_service_id
CLICK_SECRET_KEY=your_secret_key
```

## Шаг 3: Настройка URL в личном кабинете Click

1. Войдите в личный кабинет Click
2. Перейдите в настройки мерчанта
3. Установите следующие URL:

   **Prepare URL:**
   ```
   https://us-central1-odo-uz-1f4d9.cloudfunctions.net/clickPrepare
   ```

   **Complete URL:**
   ```
   https://us-central1-odo-uz-1f4d9.cloudfunctions.net/clickComplete
   ```

   **Webhook URL (для уведомлений):**
   ```
   https://us-central1-odo-uz-1f4d9.cloudfunctions.net/clickWebhook
   ```

## Шаг 4: Деплой Firebase Functions

```bash
cd /Users/dulatea/uzbekservice_app/functions
npm install
npm run build  # Если используется TypeScript
cd ..
firebase deploy --only functions
```

## Шаг 5: Настройка клиентского приложения

### Для Flutter Web (через environment variables при сборке):

```bash
flutter build web --release \
  --dart-define=CLICK_MERCHANT_ID=your_merchant_id \
  --dart-define=CLICK_SERVICE_ID=your_service_id \
  --dart-define=CLICK_SERVER_URL=https://us-central1-odo-uz-1f4d9.cloudfunctions.net
```

### Или через Firebase Remote Config (рекомендуется для production):

1. В Firebase Console перейдите в Remote Config
2. Добавьте параметры:
   - `click_merchant_id`
   - `click_service_id`
3. Обновите `ClickConfig` для чтения из Remote Config

## Шаг 6: Тестирование

1. Создайте тестовый заказ в приложении
2. Выберите оплату через Click
3. Проверьте, что:
   - Транзакция создается в Firestore
   - URL для оплаты генерируется корректно
   - После оплаты статус обновляется

## Важные замечания

⚠️ **Безопасность:**
- `secret_key` НИКОГДА не должен храниться в клиентском коде
- Используйте только серверные endpoints для работы с секретными ключами
- Всегда проверяйте подпись от Click на сервере

⚠️ **Production:**
- Используйте реальные credentials только в production
- Настройте мониторинг транзакций
- Настройте логирование для отладки

## Структура платежей

```
Firestore:
  payments/
    {transactionId}/
      - transaction_id
      - order_id
      - amount
      - status (pending/completed/failed/cancelled)
      - user_id
      - payment_method: 'click'
      - click_response (ответ от Click API)
      - created_at
      - updated_at
      - completed_at
```

## Troubleshooting

### Ошибка: "Click configuration not set"
- Проверьте, что Firebase Config установлен: `firebase functions:config:get`
- Убедитесь, что функции задеплоены после изменения конфигурации

### Ошибка: "Signature verification failed"
- Проверьте, что `secret_key` правильный
- Убедитесь, что порядок параметров в подписи соответствует документации Click

### Платеж не проходит
- Проверьте логи Firebase Functions: `firebase functions:log`
- Проверьте статус транзакции в Firestore
- Убедитесь, что URL настроены правильно в личном кабинете Click
