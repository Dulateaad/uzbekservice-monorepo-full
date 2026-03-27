#!/bin/bash

# Скрипт для быстрого перезапуска приложения

echo "🔄 Перезапуск Flutter приложения..."
echo ""

cd /Users/dulatea/uzbekservice_app

echo "📦 Очистка кеша..."
flutter clean

echo "📥 Установка зависимостей..."
flutter pub get

echo ""
echo "✅ Готово! Теперь запустите приложение:"
echo ""
echo "Для iOS:"
echo "  flutter run -d ios"
echo ""
echo "Для Android:"
echo "  flutter run -d android"
echo ""
echo "Для Web:"
echo "  flutter run -d chrome"
echo ""
echo "Или просто:"
echo "  flutter run"
echo ""

