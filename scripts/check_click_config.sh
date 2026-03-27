#!/bin/bash

# Скрипт для проверки настройки Click Payment

echo "🔍 Проверка конфигурации Click Payment..."
echo ""

# Проверка Firebase Functions конфигурации
echo "📦 Firebase Functions конфигурация:"
firebase functions:config:get | grep -A 3 click || echo "❌ Конфигурация не найдена"
echo ""

# Проверка клиентской конфигурации
echo "📱 Клиентская конфигурация (lib/config/click_config.dart):"
echo "  Merchant ID: 46893 (odo)"
echo "  Service ID: 84238 (odo)"
echo "  Server URL: https://us-central1-odo-uz-1f4d9.cloudfunctions.net"
echo ""

# Проверка Firebase Functions
echo "🔧 Проверка Firebase Functions:"
if [ -f "functions/src/index.ts" ]; then
  if grep -q "clickPrepare" functions/src/index.ts; then
    echo "  ✅ clickPrepare функция найдена"
  else
    echo "  ❌ clickPrepare функция не найдена"
  fi
  
  if grep -q "clickComplete" functions/src/index.ts; then
    echo "  ✅ clickComplete функция найдена"
  else
    echo "  ❌ clickComplete функция не найдена"
  fi
  
  if grep -q "clickWebhook" functions/src/index.ts; then
    echo "  ✅ clickWebhook функция найдена"
  else
    echo "  ❌ clickWebhook функция не найдена"
  fi
else
  echo "  ⚠️  Файл functions/src/index.ts не найден"
fi
echo ""

# Проверка деплоя функций
echo "🚀 Для деплоя Firebase Functions выполните:"
echo "   cd functions && npm install && npm run build && cd .. && firebase deploy --only functions"
echo ""

echo "✅ Проверка завершена!"

