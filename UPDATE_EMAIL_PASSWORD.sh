#!/bin/bash

# Скрипт для обновления email пароля

echo "🔧 Обновление email конфигурации..."
echo ""

if [ -z "$1" ]; then
  echo "Введите новый App Password (16 символов, БЕЗ пробелов):"
  read NEW_PASSWORD
else
  NEW_PASSWORD="$1"
fi

# Убираем пробелы из пароля
NEW_PASSWORD=$(echo "$NEW_PASSWORD" | tr -d ' ')

echo "📧 Обновление конфигурации..."
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="asdfsdassdsdd@gmail.com" \
  email.password="$NEW_PASSWORD" \
  email.from="asdfsdassdsdd@gmail.com" \
  email.from_name="Anama App"

echo ""
echo "✅ Конфигурация обновлена!"
echo ""
echo "🚀 Задеплойте функцию:"
echo "   firebase deploy --only functions:sendParentalConsentOtp"
echo ""
echo "🧪 Затем протестируйте:"
echo "   ./TEST_EMAIL_NOW.sh ваш_email@example.com"

