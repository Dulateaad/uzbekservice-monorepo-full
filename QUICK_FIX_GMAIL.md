# 🔧 Быстрое исправление Gmail аутентификации

## ❌ Проблема:
```
Invalid login: 535-5.7.8 Username and Password not accepted
```

## ✅ Решение:

### Вариант 1: Использовать скрипт (проще)

1. **Получите новый App Password:**
   - Откройте: https://myaccount.google.com/apppasswords
   - Создайте новый пароль для "Почта"
   - Скопируйте пароль (16 символов)

2. **Обновите конфигурацию:**
```bash
./UPDATE_EMAIL_PASSWORD.sh НОВЫЙ_ПАРОЛЬ_БЕЗ_ПРОБЕЛОВ
```

**Пример:**
```bash
./UPDATE_EMAIL_PASSWORD.sh wxyzabcdefghijkl
```

3. **Задеплойте функцию:**
```bash
firebase deploy --only functions:sendParentalConsentOtp
```

4. **Протестируйте:**
```bash
./TEST_EMAIL_NOW.sh ваш_email@example.com
```

---

### Вариант 2: Вручную

1. **Получите новый App Password** (см. выше)

2. **Обновите конфигурацию:**
```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="asdfsdassdsdd@gmail.com" \
  email.password="НОВЫЙ_ПАРОЛЬ_БЕЗ_ПРОБЕЛОВ" \
  email.from="asdfsdassdsdd@gmail.com" \
  email.from_name="Anama App"
```

3. **Задеплойте:**
```bash
firebase deploy --only functions:sendParentalConsentOtp
```

---

## ⚠️ Важно:

- ✅ Пароль должен быть **БЕЗ пробелов**
- ✅ Пароль должен быть **16 символов**
- ✅ Должна быть включена **двухфакторная аутентификация**

---

## 🔍 Если все еще не работает:

1. **Проверьте двухфакторную аутентификацию:**
   - https://myaccount.google.com/security
   - Должна быть включена

2. **Удалите старый App Password и создайте новый**

3. **Проверьте логи:**
```bash
firebase functions:log --only sendParentalConsentOtp
```

---

**После получения нового App Password - обновите конфигурацию и попробуйте снова!** 🔧

