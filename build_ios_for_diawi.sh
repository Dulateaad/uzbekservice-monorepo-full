#!/bin/bash
set -e
PROJECT_DIR="$HOME/uzbekservice_app"
clear
echo "==================================================================="
echo "  📱 Сборка iOS приложения для Diawi"
echo "==================================================================="
echo ""
cd "$PROJECT_DIR"
echo "1️⃣  Проверка Xcode..."
if pgrep -x "Xcode" > /dev/null; then
    echo "   ⚠️  Xcode открыт. Закройте его (Cmd + Q) и запустите скрипт снова."
    exit 1
fi
echo "   ✅ Xcode закрыт"
echo ""
echo "2️⃣  Очистка..."
flutter clean
echo "   ✅ Очищено"
echo ""
echo "3️⃣  Получение зависимостей..."
flutter pub get
echo "   ✅ Готово"
echo ""
echo "4️⃣  Сборка IPA (это займет 5-15 минут)..."
echo ""
flutter build ipa --release
echo ""
echo "==================================================================="
echo ""
IPA_PATH=$(find build/ios/ipa -name "*.ipa" 2>/dev/null | head -1)
if [ -n "$IPA_PATH" ]; then
    IPA_SIZE=$(du -h "$IPA_PATH" | cut -f1)
    IPA_NAME=$(basename "$IPA_PATH")
    echo "✅ УСПЕХ! IPA создан!"
    echo ""
    echo "📦 Файл: $IPA_NAME"
    echo "💾 Размер: $IPA_SIZE"
    echo "📁 Путь: $IPA_PATH"
    echo ""
    echo "📤 Загрузить в Diawi:"
    echo ""
    echo "   1. Откройте https://www.diawi.com/"
    echo "   2. Перетащите файл: $IPA_PATH"
    echo "   3. Скопируйте ссылку и отправьте пользователям"
    echo ""
    echo "📱 Или загрузить в TestFlight:"
    echo ""
    echo "   1. Откройте Transporter app (из App Store)"
    echo "   2. Перетащите файл: $IPA_PATH"
    echo "   3. Нажмите 'Deliver'"
    echo ""
else
    echo "❌ Build не удался - IPA не создан"
    echo ""
    echo "Проверьте ошибки выше."
    echo ""
    exit 1
fi
echo ""
