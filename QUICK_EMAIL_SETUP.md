# ⚡ Быстрая настройка Email OTP

## 🎯 Текущий проект: `anama-app`

---

## 📋 Пошаговая инструкция:

### Шаг 1: Выберите Email провайдер

#### Вариант A: Gmail (для тестирования) ⭐ Проще всего

**Что нужно:**
1. Gmail аккаунт
2. App Password (не обычный пароль!)

**Как получить App Password:**
1. Откройте: https://myaccount.google.com/apppasswords
2. Включите двухфакторную аутентификацию (если еще не включена)
3. Создайте App Password для "Почта"
4. Скопируйте пароль (16 символов, например: `abcd efgh ijkl mnop`)

**Команда для настройки:**
```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="ВАШ_EMAIL@gmail.com" \
  email.password="ВАШ_APP_PASSWORD" \
  email.from="ВАШ_EMAIL@gmail.com" \
  email.from_name="Anama App"
```

**Пример:**
```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="test@gmail.com" \
  email.password="abcd efgh ijkl mnop" \
  email.from="test@gmail.com" \
  email.from_name="Anama App"
```

---

#### Вариант B: SendGrid (для production) ⭐ Рекомендуется

**Что нужно:**
1. Зарегистрироваться: https://sendgrid.com
2. Создать API Key в настройках

**Команда для настройки:**
```bash
firebase functions:config:set \
  email.host="smtp.sendgrid.net" \
  email.port="587" \
  email.user="apikey" \
  email.password="SG.ВАШ_API_KEY" \
  email.from="noreply@anama.app" \
  email.from_name="Anama App"
```

**Важно:** 
- `email.user` всегда `"apikey"` (без кавычек в команде, но это строка)
- `email.password` - ваш SendGrid API Key (начинается с `SG.`)

---

### Шаг 2: Проверьте конфигурацию

```bash
firebase functions:config:get
```

Должно показать что-то вроде:
```
{
  "email": {
    "host": "smtp.gmail.com",
    "port": "587",
    "user": "test@gmail.com",
    "password": "abcd efgh ijkl mnop",
    "from": "test@gmail.com",
    "from_name": "Anama App"
  }
}
```

---

### Шаг 3: Задеплойте функцию

```bash
cd /Users/dulatea/uzbekservice_app
firebase deploy --only functions:sendParentalConsentOtp
```

**Ожидаемый результат:**
```
✔  functions[sendParentalConsentOtp(us-central1)] Successful create operation.
Function URL (sendParentalConsentOtp): https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp
```

---

### Шаг 4: Протестируйте отправку

#### Тест через curl:

```bash
curl -X POST https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ВАШ_ТЕСТОВЫЙ_EMAIL@example.com",
    "otp": "123456",
    "language": "ru"
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "messageId": "...",
  "email": "ВАШ_ТЕСТОВЫЙ_EMAIL@example.com"
}
```

#### Тест через приложение:

1. Откройте приложение
2. Перейдите к регистрации несовершеннолетнего
3. Введите email родителя
4. Нажмите "Отправить код подтверждения"
5. Проверьте почту (может попасть в спам!)

---

### Шаг 5: Проверьте логи

```bash
firebase functions:log --only sendParentalConsentOtp
```

Ищите строки:
- ✅ `OTP email sent to ...` - успешная отправка
- ❌ `Error sending OTP email` - ошибка отправки

---

## ⚠️ Частые проблемы:

### Проблема: "Email configuration not set"
**Решение:**
```bash
# Проверьте конфигурацию
firebase functions:config:get

# Если пусто, установите заново
firebase functions:config:set email.host="smtp.gmail.com" ...
```

### Проблема: "Authentication failed" (Gmail)
**Решение:**
- ✅ Используйте App Password, а не обычный пароль
- ✅ Убедитесь, что двухфакторная аутентификация включена
- ✅ Проверьте, что пароль скопирован правильно (без пробелов в середине)

### Проблема: Письма не приходят
**Решение:**
- ✅ Проверьте папку "Спам"
- ✅ Проверьте логи: `firebase functions:log`
- ✅ Убедитесь, что email адрес правильный

---

## ✅ Чеклист:

- [ ] Выбран email провайдер (Gmail/SendGrid)
- [ ] Получен App Password (Gmail) или API Key (SendGrid)
- [ ] Конфигурация установлена (`firebase functions:config:set`)
- [ ] Конфигурация проверена (`firebase functions:config:get`)
- [ ] Функция задеплоена (`firebase deploy`)
- [ ] Тест через curl выполнен
- [ ] Письмо получено на почту
- [ ] Логи проверены

---

## 🚀 Готово!

После выполнения всех шагов Email OTP будет работать автоматически при запросе родительского согласия.

**Нужна помощь с настройкой?** Скажите, какой вариант выбираете (Gmail или SendGrid), и я помогу с командами!

