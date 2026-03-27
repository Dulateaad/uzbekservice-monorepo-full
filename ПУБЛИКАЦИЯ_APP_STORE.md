# Публикация в App Store

## Текущие настройки

- **Версия:** 1.0.3+4 (из pubspec.yaml)
- **Bundle ID:** com.odo.uzapp.dev
- **Team ID:** YQL6CG483C
- **Подпись:** Automatic

## ⚠️ Важно перед публикацией

### 1. Bundle ID для App Store

Текущий Bundle ID: `com.odo.uzapp.dev` - это dev версия.

Для App Store нужен production Bundle ID. Варианты:
- `com.odo.uzapp` (production)
- Или оставить `com.odo.uzapp.dev` если он уже зарегистрирован в App Store Connect

**Проверьте в App Store Connect:**
1. Откройте https://appstoreconnect.apple.com
2. Перейдите в "Мои приложения"
3. Проверьте Bundle ID вашего приложения

### 2. Apple Developer Program

Убедитесь, что у вас есть активная подписка Apple Developer Program ($99/год).

## Шаг 1: Обновление версии (если нужно)

Версия уже обновлена до `1.0.3+4`. Если нужно изменить:

```yaml
# pubspec.yaml
version: 1.0.4+5  # формат: версия+build
```

## Шаг 2: Сборка IPA

### Вариант 1: Через скрипт (рекомендуется)

```bash
cd ~/uzbekservice_app
./build_ios_appstore.sh
```

### Вариант 2: Через Flutter CLI

```bash
cd ~/uzbekservice_app
flutter clean
flutter pub get
cd ios
pod install
cd ..
flutter build ipa --release
```

### Вариант 3: Через Xcode (для ручной настройки)

1. Откройте `ios/Runner.xcworkspace` в Xcode
2. Выберите "Any iOS Device" в схеме
3. Product → Archive
4. После архивации: Window → Organizer
5. Выберите архив → "Distribute App"
6. Выберите "App Store Connect"
7. Следуйте инструкциям

## Шаг 3: Загрузка в App Store Connect

### Через Transporter (рекомендуется)

1. Установите Transporter из App Store (если еще не установлен)
2. Откройте Transporter
3. Перетащите IPA файл в окно Transporter
4. Нажмите "Deliver"
5. Дождитесь загрузки

### Через Xcode Organizer

1. Откройте Xcode
2. Window → Organizer
3. Выберите архив
4. Нажмите "Distribute App"
5. Выберите "App Store Connect"
6. Следуйте инструкциям

## Шаг 4: Настройка в App Store Connect

После загрузки IPA:

1. Откройте https://appstoreconnect.apple.com
2. Перейдите в ваше приложение
3. Создайте новую версию (если нужно)
4. Заполните информацию:
   - Скриншоты (обязательно)
   - Описание приложения
   - Ключевые слова
   - Категории
   - Контактная информация
   - Политика конфиденциальности
5. Отправьте на ревью

## Требования App Store

### Обязательные элементы:

- ✅ Скриншоты (минимум для iPhone 6.7" и 6.5")
- ✅ Описание приложения
- ✅ Иконка приложения (1024x1024)
- ✅ Политика конфиденциальности (URL)
- ✅ Контактная информация

### Рекомендуется:

- Скриншоты для iPad
- Промо-видео
- Поддержка нескольких языков

## Проверка перед отправкой

- [ ] Версия обновлена
- [ ] Bundle ID правильный
- [ ] Подпись настроена
- [ ] IPA собран успешно
- [ ] IPA загружен в App Store Connect
- [ ] Вся информация заполнена
- [ ] Скриншоты добавлены
- [ ] Политика конфиденциальности указана

## Troubleshooting

### Ошибка: "No accounts found"
- Убедитесь, что вы вошли в Xcode: Xcode → Settings → Accounts
- Добавьте ваш Apple ID

### Ошибка: "No provisioning profiles found"
- Проверьте, что Bundle ID зарегистрирован в App Store Connect
- Убедитесь, что используется Automatic Signing

### Ошибка: "Invalid Bundle"
- Проверьте Bundle ID в Xcode и App Store Connect
- Убедитесь, что версия уникальна

### Ошибка: Sandbox
- Закройте Xcode
- Предоставьте Full Disk Access в System Settings
- Перезагрузите Mac

## Полезные ссылки

- [App Store Connect](https://appstoreconnect.apple.com)
- [Apple Developer Portal](https://developer.apple.com)
- [Flutter iOS Deployment](https://docs.flutter.dev/deployment/ios)
