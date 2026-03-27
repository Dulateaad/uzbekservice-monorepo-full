# 📱 Публикация Flutter приложения на iOS

## Варианты распространения:

### 1. **App Store / TestFlight** (Рекомендуется)
- ✅ Официальный способ
- ✅ Доступно всем пользователям
- ❌ Требует Apple Developer Program ($99/год)
- ❌ Требует модерацию Apple

### 2. **Ad Hoc Distribution** (Для тестирования)
- ✅ Можно раздавать до 100 устройств
- ❌ Требует Apple Developer Program ($99/год)
- ❌ Нужно регистрировать UDID каждого устройства

### 3. **Diawi / Firebase App Distribution** (Быстрое тестирование)
- ✅ Бесплатно
- ✅ Быстро
- ❌ Ограниченное количество установок
- ❌ Требует доверие к сертификату разработчика

---

## 🚀 Способ 1: TestFlight (Рекомендуется)

### Требования:
1. ✅ Apple Developer Program ($99/год)
2. ✅ Bundle ID зарегистрирован в App Store Connect
3. ✅ Сертификаты и профили настроены

### Шаги:

#### 1. Подготовка проекта:

```bash
cd /Users/dulatea/uzbekservice_app

# Обновить версию в pubspec.yaml (уже 1.0.1+2)
# Bundle ID: com.odo.uzapp.dev
```

#### 2. Настройка в Xcode:

```bash
# Открыть проект в Xcode
open ios/Runner.xcworkspace
```

В Xcode:
1. Выберите проект **Runner** в навигаторе
2. Выберите target **Runner**
3. Вкладка **Signing & Capabilities**:
   - ✅ **Automatically manage signing**
   - Выберите **Team** (ваш Apple Developer аккаунт)
   - **Bundle Identifier**: `com.odo.uzapp.dev`

#### 3. Сборка IPA:

**Вариант A: Через Xcode (Рекомендуется)**
1. В Xcode: **Product** → **Archive**
2. Дождитесь завершения сборки
3. В окне **Organizer**:
   - Выберите архив
   - Нажмите **Distribute App**
   - Выберите **App Store Connect**
   - Следуйте инструкциям

**Вариант B: Через командную строку**
```bash
cd /Users/dulatea/uzbekservice_app

# Собрать IPA
flutter build ipa --release

# IPA будет в: build/ios/ipa/odo_uz_app.ipa
```

#### 4. Загрузка в App Store Connect:

1. Откройте [App Store Connect](https://appstoreconnect.apple.com/)
2. Перейдите в **My Apps**
3. Создайте новое приложение (если еще нет):
   - **Name**: Uzbekistan Service
   - **Primary Language**: Russian
   - **Bundle ID**: com.odo.uzapp.dev
   - **SKU**: uzbekservice-app
4. Перейдите в **TestFlight**
5. Загрузите IPA через **Transporter** app или Xcode

#### 5. Настройка TestFlight:

1. После загрузки дождитесь обработки (10-30 минут)
2. Добавьте тестировщиков:
   - **Internal Testing**: до 100 тестировщиков (члены команды)
   - **External Testing**: до 10,000 тестировщиков (требует модерацию)

---

## 🚀 Способ 2: Diawi (Быстрое тестирование)

### Требования:
- ✅ Собранный IPA файл
- ✅ Сертификат разработчика (можно использовать бесплатный)

### Шаги:

#### 1. Сборка IPA:

```bash
cd /Users/dulatea/uzbekservice_app

# Собрать IPA для Ad Hoc
flutter build ipa --release

# Или через Xcode:
# Product → Archive → Distribute App → Ad Hoc
```

#### 2. Загрузка на Diawi:

1. Откройте [Diawi.com](https://www.diawi.com/)
2. Перетащите IPA файл в окно загрузки
3. Дождитесь загрузки
4. Скопируйте ссылку для скачивания
5. Отправьте ссылку пользователям

#### 3. Установка на устройство:

1. Откройте ссылку на iPhone/iPad
2. Нажмите **Install**
3. В **Настройки** → **Основные** → **Управление устройством**:
   - Доверьтесь сертификату разработчика
4. Приложение установится

---

## 🚀 Способ 3: Firebase App Distribution

### Требования:
- ✅ Firebase проект
- ✅ Firebase CLI установлен

### Шаги:

#### 1. Установка Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
```

#### 2. Настройка проекта:

```bash
cd /Users/dulatea/uzbekservice_app
firebase init appdistribution
```

#### 3. Загрузка IPA:

```bash
# Собрать IPA
flutter build ipa --release

# Загрузить в Firebase
firebase appdistribution:distribute build/ios/ipa/odo_uz_app.ipa \
  --app YOUR_FIREBASE_APP_ID \
  --groups "testers"
```

---

## ⚙️ Настройка Bundle ID и сертификатов:

### Текущий Bundle ID:
- `com.odo.uzapp.dev`

### Если нужно изменить:

1. **В Xcode:**
   - Project → Runner → General → Bundle Identifier

2. **В pubspec.yaml:**
   - Версия: `1.0.1+2` (уже настроено)

3. **В App Store Connect:**
   - Создайте новый Bundle ID или используйте существующий

---

## 🔧 Решение проблем:

### Ошибка: "No accounts"
**Решение**: Добавьте Apple ID в Xcode → Preferences → Accounts

### Ошибка: "No provisioning profiles"
**Решение**: 
- Включите "Automatically manage signing" в Xcode
- Или создайте профиль вручную в Apple Developer Portal

### Ошибка: "Bundle ID not found"
**Решение**: 
- Зарегистрируйте Bundle ID в [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
- Или используйте существующий Bundle ID

### Ошибка: Sandbox
**Решение**: 
- Закройте Xcode
- Предоставьте Full Disk Access в настройках macOS
- Перезагрузите Mac

---

## 📋 Чек-лист перед публикацией:

- [ ] Версия обновлена в `pubspec.yaml`
- [ ] Bundle ID настроен в Xcode
- [ ] Сертификаты и профили настроены
- [ ] Приложение протестировано на реальном устройстве
- [ ] Иконки и splash screen настроены
- [ ] Privacy Policy и Terms of Service готовы
- [ ] Описание приложения подготовлено
- [ ] Скриншоты для App Store готовы

---

## 🎯 Рекомендация:

Для **продакшена**: Используйте **App Store / TestFlight**
- Официальный способ
- Доступно всем пользователям
- Безопасно и надежно

Для **быстрого тестирования**: Используйте **Diawi**
- Бесплатно
- Быстро
- Не требует подписки

---

## 📞 Полезные ссылки:

- [Apple Developer Portal](https://developer.apple.com/account/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Diawi](https://www.diawi.com/)
- [Firebase App Distribution](https://firebase.google.com/docs/app-distribution)

