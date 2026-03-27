# 📧 Настройка отправки Email OTP для Parental Consent

## ✅ Что реализовано:

### 1. Firebase Function `sendParentalConsentOtp` ✅
- **Файл:** `functions/src/index.ts`
- **Endpoint:** `POST /sendParentalConsentOtp`
- **Функционал:**
  - Принимает email, OTP код и язык
  - Валидирует данные
  - Отправляет красивое HTML письмо с OTP кодом
  - Поддерживает языки: русский, казахский, английский

### 2. Интеграция в `parental_consent_service.dart` ✅
- Обновлен метод `sendOtpToEmail()`
- Вызывает Firebase Function для отправки email
- OTP код сохраняется в Firestore перед отправкой

### 3. Email шаблоны ✅
- Красивые HTML шаблоны для всех языков
- Текстовые версии для совместимости
- Информация о сроке действия кода (10 минут)

---

## 🔧 Настройка:

### Шаг 1: Установить зависимости

```bash
cd functions
npm install
```

### Шаг 2: Настроить email конфигурацию

#### Вариант A: Использовать Gmail SMTP (для тестирования)

```bash
# Установить конфигурацию в Firebase
firebase functions:config:set email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="your-email@gmail.com" \
  email.password="your-app-password" \
  email.from="your-email@gmail.com" \
  email.from_name="Anama App"
```

**Важно:** Для Gmail нужно использовать App Password, а не обычный пароль:
1. Включить двухфакторную аутентификацию
2. Создать App Password: https://myaccount.google.com/apppasswords

#### Вариант B: Использовать SendGrid (рекомендуется для production)

1. Зарегистрироваться на SendGrid: https://sendgrid.com
2. Создать API Key
3. Настроить конфигурацию:

```bash
firebase functions:config:set email.host="smtp.sendgrid.net" \
  email.port="587" \
  email.user="apikey" \
  email.password="your-sendgrid-api-key" \
  email.from="noreply@anama.app" \
  email.from_name="Anama App"
```

#### Вариант C: Использовать Mailgun

```bash
firebase functions:config:set email.host="smtp.mailgun.org" \
  email.port="587" \
  email.user="your-mailgun-username" \
  email.password="your-mailgun-password" \
  email.from="noreply@anama.app" \
  email.from_name="Anama App"
```

### Шаг 3: Собрать и задеплоить функции

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:sendParentalConsentOtp
```

---

## 📧 Формат письма:

### HTML версия:
- Красивый градиентный заголовок
- Крупный OTP код в рамке
- Предупреждение о сроке действия
- Информация о безопасности

### Текстовая версия:
- Простой текст для совместимости
- Все важные данные включены

---

## 🧪 Тестирование:

### Тест 1: Отправка через Firebase Function напрямую

```bash
curl -X POST https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "language": "ru"
  }'
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
# Просмотр логов Firebase Functions
firebase functions:log --only sendParentalConsentOtp

# Или через консоль Firebase
# https://console.firebase.google.com/project/anama-app/functions/logs
```

---

## ⚠️ Важные моменты:

### 1. Безопасность
- OTP код действителен только 10 минут
- Код удаляется из Firestore после использования
- Email валидируется перед отправкой

### 2. Обработка ошибок
- Если отправка email не удалась, OTP все равно сохраняется в Firestore
- Пользователь может запросить повторную отправку
- Логируются все ошибки для отладки

### 3. Лимиты
- Gmail: 500 писем в день (бесплатный аккаунт)
- SendGrid: 100 писем в день (бесплатный план)
- Mailgun: 5000 писем в месяц (бесплатный план)

---

## 📋 Чеклист настройки:

- [ ] Установлены зависимости (`npm install` в папке `functions`)
- [ ] Настроена email конфигурация в Firebase
- [ ] Функция собрана (`npm run build`)
- [ ] Функция задеплоена (`firebase deploy --only functions:sendParentalConsentOtp`)
- [ ] Протестирована отправка email
- [ ] Проверены логи на наличие ошибок

---

## 🚀 Готово к использованию!

После настройки email конфигурации и деплоя функции, отправка OTP будет работать автоматически при запросе родительского согласия.

