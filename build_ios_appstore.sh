#!/bin/bash
set -e

PROJECT_DIR="$HOME/uzbekservice_app"
cd "$PROJECT_DIR"

clear
echo "==================================================================="
echo "  🚀 Сборка iOS приложения для App Store"
echo "==================================================================="
echo ""

# Проверка версии
VERSION=$(grep "^version:" pubspec.yaml | sed 's/version: //')
echo "📦 Текущая версия: $VERSION"
echo ""

# Проверка Xcode
echo "1️⃣  Проверка Xcode..."
if pgrep -x "Xcode" > /dev/null; then
    echo "   ⚠️  Xcode открыт. Закройте его (Cmd + Q) и запустите скрипт снова."
    exit 1
fi
echo "   ✅ Xcode закрыт"
echo ""

# Очистка
echo "2️⃣  Очистка проекта..."
flutter clean
echo "   ✅ Очищено"
echo ""

# Получение зависимостей
echo "3️⃣  Получение зависимостей..."
flutter pub get
echo "   ✅ Готово"
echo ""

# Обновление Pods
echo "4️⃣  Обновление CocoaPods..."
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
echo "   ✅ Pods обновлены"
echo ""

# Сборка IPA для App Store
echo "5️⃣  Сборка IPA для App Store (это займет 10-20 минут)..."
echo ""
flutter build ipa --release
echo ""

echo "==================================================================="
echo ""

# Проверка результата
IPA_PATH=$(find build/ios/ipa -name "*.ipa" 2>/dev/null | head -1)
if [ -n "$IPA_PATH" ]; then
    IPA_SIZE=$(du -h "$IPA_PATH" | cut -f1)
    IPA_NAME=$(basename "$IPA_PATH")
    echo "✅ УСПЕХ! IPA создан для App Store!"
    echo ""
    echo "📦 Файл: $IPA_NAME"
    echo "💾 Размер: $IPA_SIZE"
    echo "📁 Путь: $IPA_PATH"
    echo ""
    echo "📤 Следующие шаги:"
    echo ""
    echo "   1. Откройте Transporter app (из App Store)"
    echo "   2. Перетащите файл: $IPA_PATH"
    echo "   3. Нажмите 'Deliver'"
    echo ""
    echo "   ИЛИ через Xcode:"
    echo "   1. Откройте Xcode"
    echo "   2. Window → Organizer"
    echo "   3. Импортируйте архив или используйте 'Distribute App'"
    echo ""
else
    echo "❌ Build не удался - IPA не создан"
    echo ""
    echo "Проверьте ошибки выше."
    echo ""
    exit 1
fi
echo ""
