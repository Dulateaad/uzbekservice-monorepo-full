# 🚀 Настройка Email OTP - Готово к выполнению!

## ✅ Текущий статус:

- ✅ Email конфигурация уже настроена (но нужен реальный API Key)
- ✅ Проект: `anama-app` (активен)
- ✅ Функция готова к деплою

---

## ⚠️ Что нужно сделать:

### Вариант 1: Использовать SendGrid (уже настроено)

**Текущая конфигурация:**
```
host: smtp.sendgrid.net
port: 587
user: apikey
password: your-sendgrid-api-key  ← НУЖНО ЗАМЕНИТЬ!
from: noreply@anama.app
from_name: Anama App
```

**Шаг 1: Получить SendGrid API Key**
1. Зарегистрируйтесь: https://sendgrid.com
2. Перейдите в Settings → API Keys
3. Создайте новый API Key
4. Скопируйте ключ (начинается с `SG.`)

**Шаг 2: Обновить конфигурацию**
```bash
firebase functions:config:set \
  email.password="SG.ВАШ_РЕАЛЬНЫЙ_API_KEY"
```

**Шаг 3: Задеплоить функцию**
```bash
cd /Users/dulatea/uzbekservice_app
firebase deploy --only functions:sendParentalConsentOtp
```

---

### Вариант 2: Использовать Gmail (проще для тестирования)

**Шаг 1: Получить Gmail App Password**
1. Откройте: https://myaccount.google.com/apppasswords
2. Включите двухфакторную аутентификацию (если нужно)
3. Создайте App Password для "Почта"
4. Скопируйте пароль (16 символов)

**Шаг 2: Обновить конфигурацию**
```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="ВАШ_EMAIL@gmail.com" \
  email.password="ВАШ_APP_PASSWORD" \
  email.from="ВАШ_EMAIL@gmail.com" \
  email.from_name="Anama App"
```

**Шаг 3: Задеплоить функцию**
```bash
cd /Users/dulatea/uzbekservice_app
firebase deploy --only functions:sendParentalConsentOtp
```

---

## 🧪 Тестирование после деплоя:

### Тест 1: Через curl

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

### Тест 2: Через приложение

1. Откройте приложение
2. Перейдите к регистрации несовершеннолетнего
3. Введите email родителя
4. Нажмите "Отправить код подтверждения"
5. Проверьте почту

---

## 🔍 Проверка логов:

```bash
firebase functions:log --only sendParentalConsentOtp
```

Ищите:
- ✅ `OTP email sent to ...` - успешно
- ❌ `Error sending OTP email` - ошибка

---

## 📋 Быстрый чеклист:

- [ ] Выбран вариант (SendGrid/Gmail)
- [ ] Получен API Key или App Password
- [ ] Конфигурация обновлена
- [ ] Функция задеплоена
- [ ] Тест выполнен успешно
- [ ] Письмо получено

---

## 💡 Рекомендация:

**Для быстрого тестирования:** Используйте Gmail (проще настроить)  
**Для production:** Используйте SendGrid (надежнее)

---

**Какой вариант выбираете?** Скажите, и я помогу с командами! 🚀

