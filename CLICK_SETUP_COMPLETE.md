# ✅ Click Payment - Настройка завершена

## 📋 Настроенные учетные данные

### Проект: **odo**
- **MERCHANT_ID:** `46893`
- **SERVICE_ID:** `84238`
- **SECRET_KEY:** `ThaCkSsv7b` (хранится только на сервере)
- **Merchant User ID:** `65258`

### Альтернативный набор (если нужен):
- **MERCHANT_ID:** `46893`
- **SERVICE_ID:** `84237`
- **SECRET_KEY:** `XobhnvztOINz`
- **Merchant User ID:** `65257`

---

## ✅ Что настроено:

### 1. Firebase Functions ✅
Конфигурация установлена через `firebase functions:config:set`:
```bash
click.merchant_id = "46893"
click.service_id = "84238"
click.secret_key = "ThaCkSsv7b"
```

### 2. Клиентское приложение ✅
Обновлен файл `lib/config/click_config.dart`:
- Merchant ID: `46893` (по умолчанию)
- Service ID: `84238` (по умолчанию)
- Server URL: `https://us-central1-odo-uz-1f4d9.cloudfunctions.net`

### 3. Firebase Functions код ✅
Реализованы функции:
- `clickPrepare` - подготовка платежа
- `clickComplete` - подтверждение платежа
- `clickWebhook` - обработка уведомлений от Click

---

## 🚀 Следующие шаги:

### 1. Задеплоить Firebase Functions
```bash
cd /Users/dulatea/uzbekservice_app/functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

### 2. Настроить URL в личном кабинете Click
Войдите в [my.click.uz](https://my.click.uz) и установите:

**Prepare URL:**
```
https://us-central1-odo-uz-1f4d9.cloudfunctions.net/clickPrepare
```

**Complete URL:**
```
https://us-central1-odo-uz-1f4d9.cloudfunctions.net/clickComplete
```

**Webhook URL:**
```
https://us-central1-odo-uz-1f4d9.cloudfunctions.net/clickWebhook
```

### 3. Проверить настройку
```bash
./scripts/check_click_config.sh
```

---

## 🧪 Тестирование

1. Создайте тестовый заказ в приложении
2. Выберите оплату через Click
3. Проверьте:
   - Транзакция создается в Firestore (`payments` collection)
   - URL для оплаты генерируется корректно
   - После оплаты статус обновляется

---

## 📝 Важные замечания

⚠️ **Безопасность:**
- `secret_key` хранится только на сервере (Firebase Functions)
- Клиентский код использует только `merchant_id` и `service_id`
- Все операции с секретным ключом выполняются на сервере

⚠️ **Production:**
- Убедитесь, что функции задеплоены
- Проверьте логи: `firebase functions:log`
- Настройте мониторинг транзакций

---

## 🔍 Проверка статуса

Для проверки конфигурации выполните:
```bash
# Проверить Firebase Functions конфигурацию
firebase functions:config:get | grep click

# Проверить через скрипт
./scripts/check_click_config.sh
```

---

## 📞 Поддержка

Если возникнут проблемы:
1. Проверьте логи Firebase Functions: `firebase functions:log`
2. Проверьте статус транзакций в Firestore
3. Убедитесь, что URL настроены в личном кабинете Click

---

**Дата настройки:** $(date)
**Статус:** ✅ Готово к использованию (после деплоя функций)

