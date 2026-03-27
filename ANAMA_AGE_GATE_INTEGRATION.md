# ✅ Интеграция Age Gate в процесс регистрации

## 🎯 Что сделано:

### 1. Обновлен процесс регистрации в `beautiful_login_screen.dart` ✅
- При регистрации (`_isRegistration = true`) теперь переход на Age Gate вместо прямого перехода на SMS экран
- Сохранение данных регистрации (номер телефона, имя, тип пользователя) в `FirestoreAuthProvider`
- Для входа (`_isRegistration = false`) процесс остался без изменений - сразу переход на SMS экран

### 2. Обновлен `FirestoreAuthProvider` ✅
- Добавлены методы:
  - `setRegistrationName(String name)` - сохранение имени для регистрации
  - `setRegistrationUserType(String userType)` - сохранение типа пользователя

### 3. Обновлен `AgeGateScreen` ✅
- Преобразован в `ConsumerStatefulWidget` для доступа к `FirestoreAuthProvider`
- После проверки возраста для совершеннолетних:
  - Автоматическая отправка SMS кода
  - Переход на SMS экран для ввода кода
- Для несовершеннолетних - переход на Parental Consent экран

### 4. Обновлен `ParentalConsentScreen` ✅
- Преобразован в `ConsumerStatefulWidget` для доступа к `FirestoreAuthProvider`
- После подтверждения согласия:
  - Автоматическая отправка SMS кода
  - Переход на SMS экран для ввода кода

---

## 🔄 Новый Flow регистрации:

### Для совершеннолетних (≥ 18 лет):

1. **Ввод данных** → `beautiful_login_screen.dart`
   - Ввод телефона и имени
   - Выбор типа пользователя (клиент/специалист)
   - Нажатие "Создать аккаунт"

2. **Age Gate** → `age_gate_screen.dart`
   - Выбор даты рождения
   - Определение возраста ≥ 18 лет
   - Автоматическая отправка SMS кода
   - Переход на SMS экран

3. **SMS проверка** → `sms_verification_screen.dart`
   - Ввод SMS кода
   - Проверка кода
   - Создание профиля

4. **Создание профиля** → `create_profile_screen.dart`
   - Завершение регистрации

---

### Для несовершеннолетних (< 18 лет или unknown):

1. **Ввод данных** → `beautiful_login_screen.dart`
   - Ввод телефона и имени
   - Выбор типа пользователя
   - Нажатие "Создать аккаунт"

2. **Age Gate** → `age_gate_screen.dart`
   - Выбор даты рождения
   - Определение возраста < 18 лет
   - Переход на Parental Consent

3. **Parental Consent** → `parental_consent_screen.dart`
   - Ввод данных родителя (email, телефон)
   - Отправка OTP на email
   - Проверка OTP кода
   - Подтверждение согласия
   - Автоматическая отправка SMS кода
   - Переход на SMS экран

4. **SMS проверка** → `sms_verification_screen.dart`
   - Ввод SMS кода
   - Проверка кода
   - Создание профиля

5. **Создание профиля** → `create_profile_screen.dart`
   - Завершение регистрации

---

### Для входа (без изменений):

1. **Ввод телефона** → `beautiful_login_screen.dart`
   - Ввод телефона (без имени)
   - Нажатие "Войти"

2. **SMS проверка** → `sms_verification_screen.dart`
   - Ввод SMS кода
   - Проверка кода
   - Переход на главный экран

**Примечание:** Age Gate не требуется при входе, так как пользователь уже прошел регистрацию ранее.

---

## 📋 Изменения в коде:

### `beautiful_login_screen.dart`:
```dart
// Для регистрации - переход на Age Gate
if (_isRegistration) {
  ref.read(firestoreAuthProvider.notifier).setPhoneNumber(phoneNumber);
  if (_nameController.text.isNotEmpty) {
    ref.read(firestoreAuthProvider.notifier).setRegistrationName(_nameController.text);
  }
  ref.read(firestoreAuthProvider.notifier).setRegistrationUserType(_selectedUserType);
  context.go('/auth/age-gate');
} else {
  // Для входа - сразу отправка SMS
  await ref.read(firestoreAuthProvider.notifier).sendSmsCode(...);
  context.go('/auth/sms', extra: phoneNumber);
}
```

### `age_gate_screen.dart`:
```dart
// После проверки возраста для совершеннолетних
Future<void> _sendSmsAndContinue() async {
  // Отправка SMS кода
  await ref.read(firestoreAuthProvider.notifier).sendSmsCode(...);
  // Переход на SMS экран
  context.go('/auth/sms', extra: phoneNumber);
}
```

### `parental_consent_screen.dart`:
```dart
// После подтверждения согласия
Future<void> _sendSmsAndContinue() async {
  // Отправка SMS кода
  await ref.read(firestoreAuthProvider.notifier).sendSmsCode(...);
  // Переход на SMS экран
  context.go('/auth/sms', extra: phoneNumber);
}
```

---

## ✅ Преимущества новой интеграции:

1. **Соответствие требованиям** - Age Gate обязателен для регистрации
2. **Правильная последовательность** - проверка возраста перед отправкой SMS
3. **Сохранение данных** - номер телефона и имя сохраняются между экранами
4. **Удобство** - автоматическая отправка SMS после Age Gate/Parental Consent
5. **Безопасность** - несовершеннолетние не могут пропустить Parental Consent

---

## 🧪 Тестирование:

### Тест 1: Регистрация совершеннолетнего
1. Откройте экран входа
2. Переключитесь на "Создать аккаунт"
3. Введите телефон и имя
4. Нажмите "Создать аккаунт"
5. **Ожидаемый результат:** Открывается Age Gate
6. Выберите дату рождения (например, 2000 год)
7. Нажмите "Продолжить"
8. **Ожидаемый результат:** SMS код отправлен, переход на SMS экран

### Тест 2: Регистрация несовершеннолетнего
1. Откройте экран входа
2. Переключитесь на "Создать аккаунт"
3. Введите телефон и имя
4. Нажмите "Создать аккаунт"
5. **Ожидаемый результат:** Открывается Age Gate
6. Выберите дату рождения (например, 2010 год)
7. Нажмите "Далее"
8. **Ожидаемый результат:** Открывается Parental Consent экран
9. Введите данные родителя и подтвердите согласие
10. **Ожидаемый результат:** SMS код отправлен, переход на SMS экран

### Тест 3: Вход (без Age Gate)
1. Откройте экран входа
2. Введите телефон (без имени)
3. Нажмите "Войти"
4. **Ожидаемый результат:** Сразу переход на SMS экран (без Age Gate)

---

## ✅ Статус:

- ✅ Age Gate интегрирован в процесс регистрации
- ✅ Данные регистрации сохраняются между экранами
- ✅ Автоматическая отправка SMS после Age Gate/Parental Consent
- ✅ Правильная последовательность для совершеннолетних и несовершеннолетних
- ✅ Вход работает без изменений (без Age Gate)

**Готово к использованию!** 🎉

