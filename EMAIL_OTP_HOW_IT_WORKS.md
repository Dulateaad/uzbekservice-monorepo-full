# 📧 Как работает отправка Email OTP для Parental Consent

## 🔄 Полный процесс (от начала до конца):

### 1. Пользователь начинает регистрацию несовершеннолетнего

```
Пользователь → BeautifulLoginScreen
  ↓
Вводит телефон и имя
Выбирает "Создать аккаунт"
  ↓
Переход на Age Gate
```

**Код:** `lib/screens/auth/beautiful_login_screen.dart`
- Сохраняет данные в `FirestoreAuthProvider`:
  - Номер телефона
  - Имя пользователя
  - Тип пользователя (client/specialist)

---

### 2. Проверка возраста (Age Gate)

```
Age Gate Screen
  ↓
Пользователь выбирает дату рождения
  ↓
Система определяет возраст < 18 лет
  ↓
Переход на Parental Consent Screen
```

**Код:** `lib/screens/auth/age_gate_screen.dart`
- Если возраст < 18 или unknown → требует Parental Consent
- Если возраст ≥ 18 → сразу отправляет SMS и переходит к регистрации

---

### 3. Родитель вводит данные

```
Parental Consent Screen
  ↓
Родитель вводит:
  - Email родителя
  - Телефон родителя
  ↓
Нажимает "Отправить код подтверждения"
```

**Код:** `lib/screens/auth/parental_consent_screen.dart`
- Вызывает метод `sendOtpToEmail()` из `ParentalConsentService`

---

### 4. Генерация и сохранение OTP

```
ParentalConsentService.sendOtpToEmail()
  ↓
1. Генерирует 6-значный код (например: 123456)
  ↓
2. Сохраняет в Firestore коллекцию 'parental_consent_otps':
   {
     email: "parent@example.com",
     otp: "123456",
     createdAt: Timestamp,
     expiresAt: Timestamp (через 10 минут)
   }
  ↓
3. Вызывает Firebase Function
```

**Код:** `lib/services/parental_consent_service.dart`

```dart
// Генерация OTP
final otp = _generateOtp(); // Генерирует 6 цифр

// Сохранение в Firestore
await _firestore
  .collection('parental_consent_otps')
  .doc(email)
  .set({
    'otp': otp,
    'email': email,
    'createdAt': FieldValue.serverTimestamp(),
    'expiresAt': Timestamp.fromDate(
      DateTime.now().add(Duration(minutes: 10)),
    ),
  });
```

---

### 5. Отправка HTTP запроса на Firebase Function

```
Flutter App → HTTP POST Request
  ↓
URL: https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp
  ↓
Body: {
  "email": "parent@example.com",
  "otp": "123456",
  "language": "ru"
}
```

**Код:** `lib/services/parental_consent_service.dart`

```dart
final response = await http.post(
  Uri.parse(functionUrl),
  headers: {
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'email': email,
    'otp': otp,
    'language': 'ru',
  }),
);
```

---

### 6. Firebase Function обрабатывает запрос

```
Firebase Function: sendParentalConsentOtp
  ↓
1. Валидирует данные:
   - Проверяет формат email
   - Проверяет формат OTP (6 цифр)
  ↓
2. Читает конфигурацию email из Firebase Config:
   - EMAIL_HOST (smtp.gmail.com или smtp.sendgrid.net)
   - EMAIL_PORT (587)
   - EMAIL_USER (email или apikey)
   - EMAIL_PASSWORD (пароль или API ключ)
   - EMAIL_FROM (отправитель)
   - EMAIL_FROM_NAME (имя отправителя)
  ↓
3. Создает nodemailer transporter
  ↓
4. Выбирает шаблон письма по языку (ru/kk/en)
  ↓
5. Отправляет email через SMTP
```

**Код:** `functions/src/index.ts`

```typescript
// Валидация
if (!email || !otp) {
  res.status(400).json({ error: 'Email and OTP are required' });
  return;
}

// Создание transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

// Выбор шаблона
const emailContent = emailTexts[language] || emailTexts.ru;

// Отправка
const info = await transporter.sendMail({
  from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
  to: email,
  subject: emailContent.subject,
  text: emailContent.text,
  html: emailContent.html,
});
```

---

### 7. Email отправляется через SMTP сервер

```
Firebase Function → SMTP Server (Gmail/SendGrid/Mailgun)
  ↓
SMTP Server → Email провайдер родителя (Gmail, Mail.ru и т.д.)
  ↓
Email провайдер → Почтовый ящик родителя
```

**Процесс:**
1. Firebase Function подключается к SMTP серверу
2. Аутентифицируется с помощью EMAIL_USER и EMAIL_PASSWORD
3. Отправляет письмо с OTP кодом
4. SMTP сервер доставляет письмо на почту родителя

---

### 8. Родитель получает письмо

```
Почтовый ящик родителя
  ↓
Письмо с темой: "Код подтверждения для Anama App"
  ↓
Содержимое:
  - Красивый HTML шаблон
  - Крупный OTP код: 123456
  - Предупреждение о сроке действия (10 минут)
```

**Шаблон письма включает:**
- Градиентный заголовок "Anama App"
- Крупный OTP код в рамке
- Инструкции по использованию
- Предупреждение о безопасности

---

### 9. Родитель вводит код в приложении

```
Parental Consent Screen
  ↓
Родитель вводит код: 123456
  ↓
Нажимает "Подтвердить код"
```

**Код:** `lib/screens/auth/parental_consent_screen.dart`
- Вызывает `verifyOtp()` из `ParentalConsentService`

---

### 10. Проверка OTP кода

```
ParentalConsentService.verifyOtp()
  ↓
1. Читает OTP из Firestore:
   Коллекция: 'parental_consent_otps'
   Документ: email родителя
  ↓
2. Проверяет:
   - Существует ли OTP?
   - Не истек ли срок действия? (10 минут)
   - Совпадает ли код?
  ↓
3. Если все ОК:
   - Удаляет OTP из Firestore
   - Возвращает true
  ↓
4. Если ошибка:
   - Возвращает false
```

**Код:** `lib/services/parental_consent_service.dart`

```dart
// Чтение из Firestore
final doc = await _firestore
  .collection('parental_consent_otps')
  .doc(email)
  .get();

// Проверка срока действия
if (DateTime.now().isAfter(expiresAt)) {
  await doc.reference.delete();
  return false; // Код истек
}

// Проверка кода
if (storedOtp == otp) {
  await doc.reference.delete(); // Удаляем использованный код
  return true; // Код верный
}
```

---

### 11. Создание Parental Consent

```
Если OTP подтвержден:
  ↓
Создается ParentalConsent в Firestore:
  Коллекция: 'parental_consents'
  {
    childUserId: "user_123",
    parentUserId: "parent_456",
    parentEmail: "parent@example.com",
    parentPhone: "+7...",
    consentMethod: "email_otp",
    isVerified: true,
    createdAt: Timestamp,
    verifiedAt: Timestamp,
    isActive: true
  }
```

**Код:** `lib/services/parental_consent_service.dart`

```dart
final consent = await _consentService.createParentalConsent(
  childUserId: childUserId,
  parentEmail: email,
  parentPhone: phone,
  consentMethod: 'email_otp',
);
```

---

### 12. Отправка SMS и завершение регистрации

```
После подтверждения согласия:
  ↓
Отправляется SMS код на телефон подростка
  ↓
Переход на SMS экран для ввода кода
  ↓
После проверки SMS → Создание профиля
```

**Код:** `lib/screens/auth/parental_consent_screen.dart`

```dart
// Отправка SMS
await ref.read(firestoreAuthProvider.notifier).sendSmsCode(
  phoneNumber: phoneNumber,
  name: name,
  userType: userType,
);

// Переход на SMS экран
context.go('/auth/sms', extra: phoneNumber);
```

---

## 🔐 Безопасность:

### 1. Валидация данных
- ✅ Email проверяется регулярным выражением
- ✅ OTP состоит из 6 цифр
- ✅ Все данные валидируются на сервере

### 2. Срок действия
- ✅ OTP действителен только 10 минут
- ✅ После истечения кода он удаляется из Firestore
- ✅ Использованный код удаляется сразу после проверки

### 3. Хранение данных
- ✅ OTP хранится в Firestore с TTL (время жизни)
- ✅ После использования код удаляется
- ✅ Parental Consent логируется для аудита

---

## 📊 Диаграмма потока данных:

```
[Flutter App]
    │
    ├─→ [Age Gate] → Определяет возраст
    │
    ├─→ [Parental Consent Screen] → Ввод данных родителя
    │
    ├─→ [ParentalConsentService] → Генерирует OTP
    │       │
    │       ├─→ Сохраняет в Firestore
    │       │
    │       └─→ HTTP POST → [Firebase Function]
    │                           │
    │                           ├─→ Валидация
    │                           ├─→ Создание transporter
    │                           └─→ SMTP → [Email Server]
    │                                         │
    │                                         └─→ [Почта родителя]
    │
    ├─→ [Родитель вводит код] → Проверка OTP
    │
    ├─→ [Создание Parental Consent] → Сохранение в Firestore
    │
    └─→ [Отправка SMS] → Завершение регистрации
```

---

## 🛠️ Технические детали:

### Firebase Function:
- **Язык:** TypeScript
- **Зависимости:** nodemailer, firebase-functions, firebase-admin
- **Триггер:** HTTP Request
- **Endpoint:** `POST /sendParentalConsentOtp`

### Flutter Service:
- **Файл:** `lib/services/parental_consent_service.dart`
- **Зависимости:** http, cloud_firestore
- **Методы:**
  - `sendOtpToEmail()` - отправка OTP
  - `verifyOtp()` - проверка OTP
  - `createParentalConsent()` - создание согласия

### Firestore Коллекции:
1. **`parental_consent_otps`** - временное хранение OTP кодов
2. **`parental_consents`** - постоянное хранение согласий

---

## ✅ Преимущества этого подхода:

1. **Безопасность:** OTP хранится на сервере, не передается по небезопасным каналам
2. **Надежность:** Если email не отправился, OTP все равно сохранен в Firestore
3. **Масштабируемость:** Firebase Functions автоматически масштабируются
4. **Многоязычность:** Поддержка русского, казахского и английского
5. **Красивые письма:** HTML шаблоны с градиентами и стилями

---

## 🧪 Как протестировать:

1. **Локально (Firebase Emulator):**
   ```bash
   firebase emulators:start --only functions
   ```

2. **В production:**
   ```bash
   curl -X POST https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "otp": "123456", "language": "ru"}'
   ```

3. **Через приложение:**
   - Зарегистрировать несовершеннолетнего
   - Ввести email родителя
   - Проверить почту

---

**Вот как это работает!** 🎉

