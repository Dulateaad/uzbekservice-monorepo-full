# 🔑 Как получить Email API Key/Пароль

## 📧 Вариант 1: Gmail App Password (для тестирования)

### Шаг 1: Включить двухфакторную аутентификацию

1. Откройте: https://myaccount.google.com/security
2. Найдите раздел "Двухэтапная аутентификация"
3. Нажмите "Начать"
4. Следуйте инструкциям для настройки

### Шаг 2: Создать App Password

1. Откройте: https://myaccount.google.com/apppasswords
   - Или: Google Account → Security → App passwords
   
2. Если не видите "App passwords":
   - Убедитесь, что двухфакторная аутентификация включена
   - Возможно, нужно войти в аккаунт Google

3. Выберите приложение: **"Почта"**
4. Выберите устройство: **"Другое (название)"** → введите "Anama App"
5. Нажмите **"Создать"**

6. **Скопируйте пароль** (16 символов, например: `abcd efgh ijkl mnop`)
   - ⚠️ **ВАЖНО:** Этот пароль показывается только один раз!
   - Сохраните его в безопасном месте

### Шаг 3: Использовать пароль

```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="ВАШ_EMAIL@gmail.com" \
  email.password="abcd efgh ijkl mnop" \
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

## 📧 Вариант 2: SendGrid API Key (для production)

### Шаг 1: Зарегистрироваться в SendGrid

1. Откройте: https://sendgrid.com
2. Нажмите **"Start for free"** или **"Sign Up"**
3. Заполните форму регистрации:
   - Email
   - Пароль
   - Имя компании (можно любое)
4. Подтвердите email

### Шаг 2: Верифицировать аккаунт

1. Проверьте почту от SendGrid
2. Нажмите на ссылку подтверждения
3. Заполните дополнительную информацию (можно пропустить)

### Шаг 3: Создать API Key

1. Войдите в SendGrid Dashboard
2. Перейдите в **Settings** → **API Keys**
   - Или прямая ссылка: https://app.sendgrid.com/settings/api_keys

3. Нажмите **"Create API Key"**

4. Выберите тип:
   - **"Full Access"** (для тестирования)
   - **"Restricted Access"** → выберите только "Mail Send" (рекомендуется)

5. Введите имя: **"Anama App Email"**

6. Нажмите **"Create & View"**

7. **Скопируйте API Key** (начинается с `SG.`, например: `SG.abc123xyz...`)
   - ⚠️ **ВАЖНО:** Этот ключ показывается только один раз!
   - Сохраните его в безопасном месте

### Шаг 4: Использовать API Key

```bash
firebase functions:config:set email.password="SG.ВАШ_API_KEY"
```

**Пример:**
```bash
firebase functions:config:set email.password="SG.abc123xyz456def789ghi012jkl345mno678pqr901stu234vwx567yz"
```

**Важно:** 
- `email.user` должен остаться `"apikey"` (это строка, не ваш email!)
- `email.password` - это ваш SendGrid API Key

---

## 🎯 Какой вариант выбрать?

### Gmail (рекомендуется для начала):
- ✅ Бесплатно
- ✅ Простая настройка
- ✅ 500 писем в день (достаточно для тестирования)
- ⚠️ Может попадать в спам
- ⚠️ Лимит 500 писем в день

### SendGrid (рекомендуется для production):
- ✅ Надежная доставка
- ✅ Не попадает в спам
- ✅ Хорошая аналитика
- ✅ 100 писем в день бесплатно
- ⚠️ Нужна регистрация
- ⚠️ Лимит 100 писем в день на бесплатном плане

---

## 📋 Быстрая инструкция:

### Для Gmail:

1. Откройте: https://myaccount.google.com/apppasswords
2. Создайте App Password для "Почта"
3. Скопируйте пароль (16 символов)
4. Выполните команду:
```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="ВАШ_EMAIL@gmail.com" \
  email.password="ВАШ_APP_PASSWORD" \
  email.from="ВАШ_EMAIL@gmail.com" \
  email.from_name="Anama App"
```

### Для SendGrid:

1. Зарегистрируйтесь: https://sendgrid.com
2. Создайте API Key: https://app.sendgrid.com/settings/api_keys
3. Скопируйте API Key (начинается с `SG.`)
4. Выполните команду:
```bash
firebase functions:config:set email.password="SG.ВАШ_API_KEY"
```

---

## ✅ После настройки:

1. Проверьте конфигурацию:
```bash
firebase functions:config:get
```

2. Протестируйте отправку:
```bash
curl -X POST https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp \
  -H "Content-Type: application/json" \
  -d '{"email": "ваш_тестовый_email@example.com", "otp": "123456", "language": "ru"}'
```

3. Проверьте почту (может попасть в спам!)

---

## 🔒 Безопасность:

- ⚠️ **НЕ коммитьте** пароли/ключи в Git
- ⚠️ **НЕ делитесь** паролями/ключами публично
- ✅ Храните их в безопасном месте
- ✅ Используйте разные ключи для тестирования и production

---

**Готово! Теперь у вас есть все инструкции для получения Email API Key/Пароля.** 🎉

