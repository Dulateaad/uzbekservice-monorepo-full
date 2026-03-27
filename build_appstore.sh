#!/bin/bash
set -e

PROJECT_DIR="$HOME/uzbekservice_app"
cd "$PROJECT_DIR"

clear
echo "==================================================================="
echo "  🚀 Сборка IPA для App Store"
echo "==================================================================="
echo ""

# Проверка Xcode
echo "1️⃣  Проверка Xcode..."
if pgrep -x "Xcode" > /dev/null; then
    echo "   ⚠️  Xcode открыт. Закройте его (Cmd + Q) и запустите скрипт снова."
    exit 1
fi
echo "   ✅ Xcode закрыт"
echo ""

# Проверка версии
echo "2️⃣  Проверка версии..."
VERSION=$(grep "^version:" pubspec.yaml | sed 's/version: //')
echo "   📦 Версия: $VERSION"
echo ""

# Очистка
echo "3️⃣  Очистка проекта..."
flutter clean
echo "   ✅ Очищено"
echo ""

# Получение зависимостей
echo "4️⃣  Получение зависимостей..."
flutter pub get
echo "   ✅ Зависимости установлены"
echo ""

# Обновление Pods
echo "5️⃣  Обновление CocoaPods..."
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
echo "   ✅ Pods обновлены"
echo ""

# Сборка IPA для App Store
echo "6️⃣  Сборка IPA для App Store (это займет 10-20 минут)..."
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
    echo "   4. Войдите в App Store Connect"
    echo "   5. Дождитесь обработки билда"
    echo "   6. Создайте новую версию в App Store Connect"
    echo "   7. Заполните информацию и отправьте на ревью"
    echo ""
    echo "📋 Bundle ID: com.odo.uzapp.dev"
    echo "📋 Версия: $VERSION"
    echo ""
else
    echo "❌ Build не удался - IPA не создан"
    echo ""
    echo "Проверьте ошибки выше."
    echo ""
    exit 1
fi

echo ""

