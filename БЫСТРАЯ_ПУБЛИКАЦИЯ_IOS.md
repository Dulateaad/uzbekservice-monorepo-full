# 🚀 Быстрая публикация iOS приложения

## Варианты (от простого к сложному):

### 1. **Diawi** (Самый простой, для тестирования)
- ⏱️ 5 минут
- 💰 Бесплатно
- ✅ Не требует Apple Developer Program

### 2. **TestFlight** (Для бета-тестирования)
- ⏱️ 30-60 минут
- 💰 $99/год (Apple Developer Program)
- ✅ Официальный способ

### 3. **App Store** (Для продакшена)
- ⏱️ 1-7 дней (модерация)
- 💰 $99/год (Apple Developer Program)
- ✅ Доступно всем пользователям

---

## 🎯 Вариант 1: Diawi (Рекомендуется для начала)

### Шаг 1: Собрать IPA

**Через Xcode (рекомендуется):**
1. Откройте: `open ios/Runner.xcworkspace`
2. **Product** → **Archive**
3. Дождитесь сборки
4. В **Organizer**:
   - Выберите архив
   - **Distribute App**
   - **Ad Hoc** или **Development**
   - Сохраните IPA

**Или через командную строку:**
```bash
cd /Users/dulatea/uzbekservice_app
flutter build ipa --release
# IPA будет в: build/ios/ipa/odo_uz_app.ipa
```

### Шаг 2: Загрузить на Diawi

1. Откройте [diawi.com](https://www.diawi.com/)
2. Перетащите IPA файл
3. Скопируйте ссылку
4. Отправьте пользователям

### Шаг 3: Установка на iPhone

1. Откройте ссылку на iPhone
2. Нажмите **Install**
3. **Настройки** → **Основные** → **Управление устройством**
4. Доверьтесь сертификату
5. Готово! ✅

---

## 🎯 Вариант 2: TestFlight

### Требования:
- ✅ Apple Developer Program ($99/год)
- ✅ Bundle ID зарегистрирован

### Шаги:

1. **Собрать IPA** (как в варианте 1)
2. **Загрузить в App Store Connect:**
   - Откройте [App Store Connect](https://appstoreconnect.apple.com/)
   - **My Apps** → Создайте приложение
   - **TestFlight** → Загрузите IPA
3. **Добавить тестировщиков:**
   - **Internal Testing**: до 100 человек
   - **External Testing**: до 10,000 человек

---

## ⚙️ Текущие настройки проекта:

- **Bundle ID**: `com.odo.uzapp.dev`
- **Версия**: `1.0.1+2`
- **Название**: ODO.UZ

---

## 🔧 Если не работает сборка:

### Проблема: Sandbox ошибки
**Решение**: 
1. **System Settings** → **Privacy & Security** → **Full Disk Access**
2. Добавьте **Xcode** и **Terminal**
3. Перезагрузите Mac

### Проблема: Нет сертификата
**Решение**: 
1. Откройте Xcode
2. **Preferences** → **Accounts**
3. Добавьте Apple ID
4. В проекте: **Signing & Capabilities** → **Automatically manage signing**

---

## 📞 Нужна помощь?

Смотрите подробную инструкцию: `ПУБЛИКАЦИЯ_IOS.md`

