# ✅ Email OTP - Готово к деплою!

## 🎉 Статус:

- ✅ Зависимости установлены
- ✅ TypeScript код скомпилирован без ошибок
- ✅ Функция `sendParentalConsentOtp` готова
- ✅ Интеграция в `parental_consent_service.dart` завершена
- ✅ Email шаблоны созданы (ru, kk, en)

---

## 📋 Следующие шаги:

### 1. Настроить Email конфигурацию

Выберите один из вариантов:

#### Вариант A: Gmail SMTP (для тестирования)

```bash
firebase functions:config:set email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="your-email@gmail.com" \
  email.password="your-app-password" \
  email.from="your-email@gmail.com" \
  email.from_name="Anama App"
```

**Важно:** Для Gmail нужно использовать App Password:
1. Включить двухфакторную аутентификацию
2. Создать App Password: https://myaccount.google.com/apppasswords

#### Вариант B: SendGrid (рекомендуется для production)

```bash
firebase functions:config:set email.host="smtp.sendgrid.net" \
  email.port="587" \
  email.user="apikey" \
  email.password="your-sendgrid-api-key" \
  email.from="noreply@anama.app" \
  email.from_name="Anama App"
```

---

### 2. Задеплоить функцию

```bash
cd /Users/dulatea/uzbekservice_app
firebase deploy --only functions:sendParentalConsentOtp
```

Или задеплоить все функции:

```bash
firebase deploy --only functions
```

---

### 3. Протестировать отправку

#### Тест через curl:

```bash
curl -X POST https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "language": "ru"
  }'
```

#### Тест через приложение:

1. Откройте приложение
2. Перейдите к регистрации несовершеннолетнего
3. Введите email родителя
4. Нажмите "Отправить код подтверждения"
5. Проверьте почту

---

## 🔍 Проверка логов:

```bash
# Просмотр логов в реальном времени
firebase functions:log --only sendParentalConsentOtp

# Или через консоль Firebase
# https://console.firebase.google.com/project/anama-app/functions/logs
```

---

## ⚠️ Важные моменты:

### Безопасность:
- ✅ OTP код действителен только 10 минут
- ✅ Код удаляется из Firestore после использования
- ✅ Email валидируется перед отправкой
- ✅ OTP состоит из 6 цифр

### Обработка ошибок:
- ✅ Если отправка email не удалась, OTP все равно сохраняется в Firestore
- ✅ Пользователь может запросить повторную отправку
- ✅ Все ошибки логируются для отладки

### Лимиты:
- Gmail: 500 писем в день (бесплатный аккаунт)
- SendGrid: 100 писем в день (бесплатный план)
- Mailgun: 5000 писем в месяц (бесплатный план)

---

## 📧 Формат письма:

### HTML версия включает:
- Красивый градиентный заголовок
- Крупный OTP код в рамке
- Предупреждение о сроке действия (10 минут)
- Информация о безопасности
- Поддержка русского, казахского и английского языков

### Текстовая версия:
- Простой текст для совместимости
- Все важные данные включены

---

## ✅ Чеклист перед деплоем:

- [x] Зависимости установлены (`npm install`)
- [x] TypeScript код скомпилирован (`npm run build`)
- [ ] Email конфигурация настроена (`firebase functions:config:set`)
- [ ] Функция задеплоена (`firebase deploy --only functions:sendParentalConsentOtp`)
- [ ] Протестирована отправка email
- [ ] Проверены логи на наличие ошибок

---

## 🚀 Готово к использованию!

После настройки email конфигурации и деплоя функции, отправка OTP будет работать автоматически при запросе родительского согласия.

**Следующий шаг:** Настроить email конфигурацию и задеплоить функцию!

