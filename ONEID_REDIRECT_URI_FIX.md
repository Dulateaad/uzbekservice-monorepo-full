# ✅ Исправление ошибки OneID REDIRECT_URI_TYPE_NOT_SUPPORTED

## 🐛 Проблема:

OneID возвращал ошибку:
```json
{
  "status": 400,
  "message": "RedirectUriException",
  "path": "/sso/oauth/Authorization.do",
  "error": "REDIRECT_URI_TYPE_NOT_SUPPORTED",
  "timestamp": 1766671427869
}
```

## 🔍 Причина:

OneID **не поддерживает** custom scheme redirect_uri (`odouzapp://oneid/callback`).  
OneID требует **HTTP/HTTPS** redirect_uri для безопасности.

## ✅ Решение:

### 1. Изменен redirect_uri на HTTP URL

**Было:**
```
odouzapp://oneid/callback
```

**Стало:**
```
https://us-central1-odo-uz-app.cloudfunctions.net/oneidCallback
```

### 2. Обновлен callback для обработки GET запросов

OneID отправляет callback как **GET запрос** с параметрами в query string:
```
https://us-central1-odo-uz-app.cloudfunctions.net/oneidCallback?code=XXX&state=YYY
```

### 3. Добавлен редирект на мобильное приложение

После обработки callback, функция редиректит на мобильное приложение через deep link:
```
odouzapp://oneid/callback?access_token=XXX&refresh_token=YYY&user=ZZZ
```

---

## 📋 Изменения в коде:

### `functions/src/index.ts`:

1. **Изменен redirect_uri:**
```typescript
const ONEID_REDIRECT_URI = 'https://us-central1-odo-uz-app.cloudfunctions.net/oneidCallback';
```

2. **Обновлен callback для обработки GET запросов:**
```typescript
export const oneidCallback = functions.https.onRequest(async (req, res) => {
  // Поддержка GET и POST
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  // Извлечение параметров из query string (GET) или body (POST)
  const code = req.method === 'GET' ? req.query.code : req.body?.code;
  const error = req.method === 'GET' ? req.query.error : req.body?.error;
  
  // После обработки - редирект на мобильное приложение
  if (req.method === 'GET') {
    const mobileRedirectUri = `odouzapp://oneid/callback?access_token=${access_token}...`;
    res.redirect(mobileRedirectUri);
    return;
  }
  
  // Для POST возвращаем JSON
  res.json(response);
});
```

### `lib/config/oneid_config.dart`:

```dart
// HTTP redirect_uri для OneID (OneID требует HTTP/HTTPS)
static const String redirectUri = '$backendUrl/oneidCallback';

// Mobile app redirect scheme (для deep linking после получения токена)
static const String mobileRedirectUri = '$redirectScheme://oneid/callback';
```

---

## 🔄 Новый flow авторизации:

1. **Клиент** вызывает `/oneidLogin` с HTTP redirect_uri
2. **Backend** редиректит на OneID с HTTP redirect_uri
3. **OneID** обрабатывает авторизацию
4. **OneID** редиректит на HTTP callback URL с `code`
5. **Backend** получает callback, обменивает `code` на `token`
6. **Backend** редиректит на мобильное приложение через deep link с токеном
7. **Мобильное приложение** получает токен через deep link

---

## ✅ Статус:

- ✅ Redirect_uri изменен на HTTP URL
- ✅ Callback обновлен для обработки GET запросов
- ✅ Добавлен редирект на мобильное приложение
- ✅ Функции задеплоены на Firebase

---

## 🧪 Тестирование:

1. Откройте приложение
2. Нажмите "Войти через OneID"
3. Авторизуйтесь в OneID
4. Должен произойти редирект на мобильное приложение с токеном

---

## 📝 Важно:

⚠️ **Redirect_uri должен быть зарегистрирован в OneID**  
Убедитесь, что `https://us-central1-odo-uz-app.cloudfunctions.net/oneidCallback` зарегистрирован в настройках приложения OneID.

---

**Исправлено и задеплоено!** ✅

