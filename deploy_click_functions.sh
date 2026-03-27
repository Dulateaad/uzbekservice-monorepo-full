#!/bin/bash

# Скрипт для деплоя Firebase Functions для Click Payment

set -e  # Остановить при ошибке

echo "🚀 Деплой Firebase Functions для Click Payment..."
echo ""

# Переходим в директорию проекта
cd "$(dirname "$0")"

echo "📁 Текущая директория: $(pwd)"
echo ""

# Проверяем наличие firebase.json
if [ ! -f "firebase.json" ]; then
  echo "❌ Ошибка: firebase.json не найден!"
  echo "   Убедитесь, что вы находитесь в корне проекта"
  exit 1
fi

# Переходим в директорию functions
echo "📦 Переход в директорию functions..."
cd functions

# Проверяем наличие package.json
if [ ! -f "package.json" ]; then
  echo "❌ Ошибка: package.json не найден в директории functions!"
  exit 1
fi

# Устанавливаем зависимости
echo "📥 Установка зависимостей..."
npm install

# Компилируем TypeScript
echo "🔨 Компиляция TypeScript..."
npm run build

# Проверяем, что компиляция прошла успешно
if [ ! -f "lib/index.js" ]; then
  echo "❌ Ошибка: lib/index.js не найден после компиляции!"
  exit 1
fi

echo "✅ Компиляция завершена успешно!"
echo ""

# Возвращаемся в корень проекта
cd ..

# Деплоим функции
echo "🚀 Деплой Firebase Functions..."
firebase deploy --only functions

echo ""
echo "✅ Деплой завершен успешно!"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Настройте URL в личном кабинете Click (my.click.uz):"
echo "      - Prepare URL: https://us-central1-odo-uz-1f4d9.cloudfunctions.net/clickPrepare"
echo "      - Complete URL: https://us-central1-odo-uz-1f4d9.cloudfunctions.net/clickComplete"
echo "      - Webhook URL: https://us-central1-odo-uz-1f4d9.cloudfunctions.net/clickWebhook"
echo ""
echo "   2. Проверьте логи: firebase functions:log"

