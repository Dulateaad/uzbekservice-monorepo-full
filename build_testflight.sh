#!/bin/bash
# Сборка IPA для TestFlight (beta-тестирование)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==================================================================="
echo "  🧪 Сборка IPA для TestFlight"
echo "==================================================================="
echo ""

# Проверка Xcode (пропустить с --force)
echo "1️⃣  Проверка Xcode..."
if [ "$1" != "--force" ] && pgrep -x "Xcode" > /dev/null; then
    echo "   ⚠️  Xcode открыт. Закройте его (Cmd + Q) или запустите: $0 --force"
    exit 1
fi
echo "   ✅ Готово"
echo ""

# Версия
VERSION=$(grep "^version:" pubspec.yaml | sed 's/version: //')
echo "2️⃣  Версия: $VERSION"
echo ""

# Очистка
echo "3️⃣  Очистка..."
flutter clean
echo "   ✅ Очищено"
echo ""

# Зависимости
echo "4️⃣  Зависимости..."
flutter pub get
echo "   ✅ Готово"
echo ""

# CocoaPods (--clean для полной переустановки)
echo "5️⃣  CocoaPods..."
cd ios
if [ "$1" = "--clean" ] || [ "$2" = "--clean" ]; then
    rm -rf Pods Podfile.lock
    pod install --repo-update
else
    pod install
fi
cd ..
echo "   ✅ Pods готовы"
echo ""

# Сборка
echo "6️⃣  Сборка IPA (10–20 мин)..."
echo ""
flutter build ipa --release
echo ""

echo "==================================================================="

# Результат
IPA_PATH=$(find build/ios/ipa -name "*.ipa" 2>/dev/null | head -1)
if [ -n "$IPA_PATH" ]; then
    IPA_SIZE=$(du -h "$IPA_PATH" | cut -f1)
    IPA_NAME=$(basename "$IPA_PATH")
    
    echo ""
    echo "✅ IPA готов для TestFlight!"
    echo ""
    echo "📦 Файл: $IPA_NAME"
    echo "💾 Размер: $IPA_SIZE"
    echo "📁 Путь: $IPA_PATH"
    echo ""
    echo "📤 Загрузка в TestFlight:"
    echo ""
    echo "   1. Откройте Transporter (из App Store)"
    echo "   2. Перетащите: $IPA_PATH"
    echo "   3. Нажмите 'Deliver'"
    echo ""
    echo "   Или: open -a Transporter \"$IPA_PATH\""
    echo ""
    echo "📋 Bundle ID: com.odo.uzapp.dev"
    echo "📋 Версия: $VERSION"
    echo ""
    echo "После загрузки билд появится в App Store Connect → TestFlight."
    echo ""
else
    echo "❌ Ошибка сборки — IPA не создан"
    exit 1
fi
