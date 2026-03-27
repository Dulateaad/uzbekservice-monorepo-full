# ✅ Email конфигурация настроена!

## 📧 Настройки:

- **Email сервис:** Gmail SMTP
- **Отправитель:** asdfsdassdsdd@gmail.com
- **Имя отправителя:** Anama App
- **Порт:** 587

---

## 🧪 Тестирование:

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

**Замените `ВАШ_ТЕСТОВЫЙ_EMAIL@example.com` на реальный email для тестирования!**

### Тест 2: Через приложение

1. Откройте приложение
2. Перейдите к регистрации несовершеннолетнего
3. Введите email родителя (любой email)
4. Нажмите "Отправить код подтверждения"
5. Проверьте почту родителя

---

## 🔍 Проверка логов:

```bash
firebase functions:log --only sendParentalConsentOtp
```

---

## ✅ Готово!

Email конфигурация настроена и функция задеплоена. Теперь родители будут получать письма с OTP кодами на свой email адрес!

