# 🌐 Все задеплоенные URL для проекта odo-uz-app

## 📋 Проект: odo-uz-app
**Project ID:** `992975687865`  
**Регион:** `us-central1`

---

## 🔧 Backend (Firebase Cloud Functions)

**Base URL:** `https://us-central1-odo-uz-app.cloudfunctions.net`

### Click Payment Functions:

1. **clickPrepare**
   - URL: `https://us-central1-odo-uz-app.cloudfunctions.net/clickPrepare`
   - Метод: POST
   - Назначение: Подготовка платежа через Click

2. **clickComplete**
   - URL: `https://us-central1-odo-uz-app.cloudfunctions.net/clickComplete`
   - Метод: POST
   - Назначение: Подтверждение платежа

3. **clickWebhook**
   - URL: `https://us-central1-odo-uz-app.cloudfunctions.net/clickWebhook`
   - Метод: POST
   - Назначение: Webhook для уведомлений от Click

### OneID Functions:

4. **oneidHealth**
   - URL: `https://us-central1-odo-uz-app.cloudfunctions.net/oneidHealth`
   - Метод: GET
   - Назначение: Проверка работоспособности

5. **oneidLogin**
   - URL: `https://us-central1-odo-uz-app.cloudfunctions.net/oneidLogin`
   - Метод: GET
   - Назначение: Редирект на OneID авторизацию

6. **oneidCallback**
   - URL: `https://us-central1-odo-uz-app.cloudfunctions.net/oneidCallback`
   - Метод: POST
   - Назначение: Обмен кода на токен

7. **oneidUser**
   - URL: `https://us-central1-odo-uz-app.cloudfunctions.net/oneidUser`
   - Метод: GET
   - Назначение: Получение данных пользователя

---

## 🌐 Frontend (Flutter Web App)

**Хостинг:** Firebase Hosting

**URL приложения:**
- Основной: `https://odo-uz-app.web.app`
- Альтернативный: `https://odo-uz-app.firebaseapp.com`

**Последний деплой:** 22 декабря 2025

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

## 🔍 Проверка:

### Проверить функции:
```bash
firebase functions:list
```

### Проверить хостинг:
```bash
firebase hosting:sites:list
```

### Проверить конфигурацию:
```bash
firebase functions:config:get
```

---

## 📊 Статус:

- ✅ **Backend (Functions):** Все 7 функций задеплоены и работают
- ✅ **Frontend (Hosting):** Настроен, доступен по URL
- ✅ **Проект:** odo-uz-app (992975687865)

---

**Все функции работают на:** `https://us-central1-odo-uz-app.cloudfunctions.net`

