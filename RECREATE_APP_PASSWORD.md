# 🔑 Как пересоздать Gmail App Password

## 📋 Пошаговая инструкция:

### Шаг 1: Откройте страницу App Passwords

Прямая ссылка: https://myaccount.google.com/apppasswords

Или:
1. Откройте: https://myaccount.google.com/security
2. Найдите "App passwords" (Пароли приложений)
3. Нажмите на него

---

### Шаг 2: Проверьте двухфакторную аутентификацию

**Если не включена:**
1. Включите двухфакторную аутентификацию:
   - https://myaccount.google.com/security
   - Раздел "Двухэтапная аутентификация" → "Начать"
2. Следуйте инструкциям для настройки

**Если включена:**
- Продолжайте к следующему шагу

---

### Шаг 3: Создайте новый App Password

1. На странице App Passwords выберите:
   - **Приложение:** "Почта" (Mail)
   - **Устройство:** "Другое (название)" → введите `Anama App`

2. Нажмите **"Создать"**

3. **Скопируйте пароль** (16 символов)
   - ⚠️ **ВАЖНО:** Пароль показывается только один раз!
   - Пример: `abcd efgh ijkl mnop`
   - Используйте БЕЗ пробелов: `abcdefghijklmnop`

---

### Шаг 4: Обновите конфигурацию Firebase

**Замените `НОВЫЙ_ПАРОЛЬ` на ваш новый App Password (БЕЗ пробелов):**

```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="asdfsdassdsdd@gmail.com" \
  email.password="НОВЫЙ_ПАРОЛЬ_БЕЗ_ПРОБЕЛОВ" \
  email.from="asdfsdassdsdd@gmail.com" \
  email.from_name="Anama App"
```

**Пример (если новый пароль `wxyz abcd efgh ijkl`):**
```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="asdfsdassdsdd@gmail.com" \
  email.password="wxyzabcdefghijkl" \
  email.from="asdfsdassdsdd@gmail.com" \
  email.from_name="Anama App"
```

---

### Шаг 5: Задеплойте функцию

```bash
firebase deploy --only functions:sendParentalConsentOtp
```

---

### Шаг 6: Протестируйте

```bash
./TEST_EMAIL_NOW.sh ваш_email@example.com
```

---

## ⚠️ Важно:

1. **Пароль БЕЗ пробелов** - убирайте все пробелы из App Password
2. **Пароль 16 символов** - должен быть именно 16 символов
3. **Только буквы и цифры** - без специальных символов

---

## 🔍 Проверка:

После обновления проверьте конфигурацию:
```bash
firebase functions:config:get email
```

Убедитесь, что пароль правильный (без пробелов).

---

**После пересоздания App Password и обновления конфигурации - попробуйте снова!** 🔧

