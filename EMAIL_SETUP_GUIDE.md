# 📧 Настройка Email для Parental Consent OTP

## 🎯 Цель:
Настроить отправку email OTP кодов для подтверждения родительского согласия.

---

## 📋 Шаг 1: Выбор Email провайдера

### Вариант A: Gmail SMTP (для тестирования) ⭐ Рекомендуется для начала

**Преимущества:**
- ✅ Бесплатно
- ✅ Простая настройка
- ✅ 500 писем в день (достаточно для тестирования)

**Недостатки:**
- ⚠️ Лимит 500 писем в день
- ⚠️ Может попадать в спам

**Настройка:**
1. Включить двухфакторную аутентификацию в Gmail
2. Создать App Password: https://myaccount.google.com/apppasswords
3. Использовать этот пароль (не обычный пароль Gmail!)

---

### Вариант B: SendGrid (для production) ⭐ Рекомендуется для production

**Преимущества:**
- ✅ Надежная доставка
- ✅ Не попадает в спам
- ✅ Хорошая аналитика
- ✅ 100 писем в день бесплатно

**Недостатки:**
- ⚠️ Нужна регистрация
- ⚠️ Лимит 100 писем в день на бесплатном плане

**Настройка:**
1. Зарегистрироваться: https://sendgrid.com
2. Создать API Key в настройках
3. Использовать API Key как пароль

---

## 🔧 Шаг 2: Настройка конфигурации Firebase

### Для Gmail:

```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="your-email@gmail.com" \
  email.password="your-app-password" \
  email.from="your-email@gmail.com" \
  email.from_name="Anama App"
```

**Важно:** Используйте App Password, а не обычный пароль!

### Для SendGrid:

```bash
firebase functions:config:set \
  email.host="smtp.sendgrid.net" \
  email.port="587" \
  email.user="apikey" \
  email.password="SG.your-sendgrid-api-key" \
  email.from="noreply@anama.app" \
  email.from_name="Anama App"
```

**Важно:** 
- `email.user` всегда должен быть `"apikey"`
- `email.password` - это ваш SendGrid API Key (начинается с `SG.`)

---

## 🚀 Шаг 3: Деплой функции

```bash
cd /Users/dulatea/uzbekservice_app
firebase deploy --only functions:sendParentalConsentOtp
```

Или задеплоить все функции:

```bash
firebase deploy --only functions
```

---

## 🧪 Шаг 4: Тестирование

### Тест 1: Через curl

```bash
curl -X POST https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@example.com",
    "otp": "123456",
    "language": "ru"
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "messageId": "...",
  "email": "your-test-email@example.com"
}
```

### Тест 2: Через приложение

1. Откройте приложение
2. Перейдите к регистрации несовершеннолетнего
3. Введите email родителя
4. Нажмите "Отправить код подтверждения"
5. Проверьте почту

---

## 🔍 Проверка логов

```bash
# Просмотр логов в реальном времени
firebase functions:log --only sendParentalConsentOtp

# Или через консоль Firebase
# https://console.firebase.google.com/project/anama-app/functions/logs
```

---

## ⚠️ Частые проблемы:

### Проблема 1: "Email configuration not set"
**Решение:** Проверьте, что конфигурация установлена:
```bash
firebase functions:config:get
```

### Проблема 2: "Authentication failed" (Gmail)
**Решение:** 
- Убедитесь, что используете App Password, а не обычный пароль
- Проверьте, что двухфакторная аутентификация включена

### Проблема 3: "Connection timeout"
**Решение:**
- Проверьте интернет соединение
- Убедитесь, что порт 587 не заблокирован

### Проблема 4: Письма попадают в спам
**Решение:**
- Используйте SendGrid для production
- Настройте SPF и DKIM записи для домена

---

## ✅ Чеклист:

- [ ] Выбран email провайдер (Gmail/SendGrid)
- [ ] Конфигурация настроена (`firebase functions:config:set`)
- [ ] Конфигурация проверена (`firebase functions:config:get`)
- [ ] Функция задеплоена (`firebase deploy --only functions:sendParentalConsentOtp`)
- [ ] Тест через curl выполнен успешно
- [ ] Тест через приложение выполнен успешно
- [ ] Письмо получено на почту
- [ ] Логи проверены на наличие ошибок

---

## 📝 Примеры команд:

### Полная настройка Gmail:

```bash
# 1. Установить конфигурацию
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="your-email@gmail.com" \
  email.password="abcd efgh ijkl mnop" \
  email.from="your-email@gmail.com" \
  email.from_name="Anama App"

# 2. Проверить конфигурацию
firebase functions:config:get

# 3. Задеплоить функцию
cd /Users/dulatea/uzbekservice_app
firebase deploy --only functions:sendParentalConsentOtp

# 4. Протестировать
curl -X POST https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456", "language": "ru"}'
```

---

**Готово! После выполнения этих шагов Email OTP будет работать.** 🎉

