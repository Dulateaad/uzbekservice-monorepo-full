# 🔗 Firebase Functions - URL всех функций

## 🌐 Хост: Firebase Cloud Functions

**Base URL:** `https://us-central1-odo-uz-app.cloudfunctions.net`

**Регион:** `us-central1` (США, Центральный регион)

**Проект:** `odo-uz-app`

---

## 📡 Click Payment Functions:

### 1. clickPrepare
**URL:** `https://us-central1-odo-uz-app.cloudfunctions.net/clickPrepare`
- **Метод:** POST
- **Назначение:** Подготовка платежа через Click
- **Статус:** ✅ Активна

### 2. clickComplete
**URL:** `https://us-central1-odo-uz-app.cloudfunctions.net/clickComplete`
- **Метод:** POST
- **Назначение:** Подтверждение платежа после оплаты
- **Статус:** ✅ Активна

### 3. clickWebhook
**URL:** `https://us-central1-odo-uz-app.cloudfunctions.net/clickWebhook`
- **Метод:** POST
- **Назначение:** Webhook для уведомлений от Click
- **Статус:** ✅ Активна

---

## 🔐 OneID Functions:

### 4. oneidHealth
**URL:** `https://us-central1-odo-uz-app.cloudfunctions.net/oneidHealth`
- **Метод:** GET
- **Назначение:** Проверка работоспособности OneID сервиса
- **Статус:** ✅ Активна

### 5. oneidLogin
**URL:** `https://us-central1-odo-uz-app.cloudfunctions.net/oneidLogin`
- **Метод:** GET
- **Назначение:** Редирект на OneID авторизацию
- **Статус:** ✅ Активна

### 6. oneidCallback
**URL:** `https://us-central1-odo-uz-app.cloudfunctions.net/oneidCallback`
- **Метод:** POST
- **Назначение:** Обмен authorization code на access token
- **Статус:** ✅ Активна

### 7. oneidUser
**URL:** `https://us-central1-odo-uz-app.cloudfunctions.net/oneidUser`
- **Метод:** GET
- **Назначение:** Получение данных пользователя по access token
- **Статус:** ✅ Активна

---

## 📊 Статус деплоя:

**Дата последнего деплоя:** 25 декабря 2025

**Всего функций:** 7

**Версия:** v1

**Runtime:** Node.js 20

**Memory:** 256 MB (каждая функция)

**Location:** us-central1

---

## 🧪 Тестирование:

### Health Check:
```bash
curl https://us-central1-odo-uz-app.cloudfunctions.net/oneidHealth
```

### Click Prepare:
```bash
curl -X POST https://us-central1-odo-uz-app.cloudfunctions.net/clickPrepare \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test","amount":1000,"userId":"test"}'
```

### OneID Login:
```bash
curl "https://us-central1-odo-uz-app.cloudfunctions.net/oneidLogin?redirect_uri=odouzapp://oneid/callback&state=test"
```

---

## 🔍 Мониторинг:

### Просмотр логов:
```bash
firebase functions:log
```

### Просмотр конкретной функции:
```bash
firebase functions:log --only clickPrepare
firebase functions:log --only oneidLogin
```

### Консоль Firebase:
https://console.firebase.google.com/project/odo-uz-app/functions

---

## ✅ Конфигурация в приложении:

### Click Config (`lib/config/click_config.dart`):
```dart
static const String serverBaseUrl = 'https://us-central1-odo-uz-app.cloudfunctions.net';
```

### OneID Config (`lib/config/oneid_config.dart`):
```dart
static const String backendUrl = 'https://us-central1-odo-uz-app.cloudfunctions.net';
```

---

## 🎯 Итог:

**Все функции задеплоены на Firebase Cloud Functions:**
- ✅ Хост: `us-central1-odo-uz-app.cloudfunctions.net`
- ✅ Регион: `us-central1`
- ✅ Проект: `odo-uz-app`
- ✅ Статус: Все функции активны и работают

