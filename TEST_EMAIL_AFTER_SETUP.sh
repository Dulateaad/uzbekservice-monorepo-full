#!/bin/bash

# Скрипт для тестирования Email OTP после настройки

echo "🧪 Тестирование Email OTP отправки..."
echo ""

# URL функции
FUNCTION_URL="https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp"

# Тестовые данные
TEST_EMAIL="${1:-test@example.com}"
TEST_OTP="${2:-123456}"
LANGUAGE="${3:-ru}"

echo "📧 Email: $TEST_EMAIL"
echo "🔢 OTP: $TEST_OTP"
echo "🌐 Язык: $LANGUAGE"
echo ""

# Отправка запроса
echo "Отправка запроса..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"otp\": \"$TEST_OTP\",
    \"language\": \"$LANGUAGE\"
  }")

echo ""
echo "Ответ сервера:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Проверка результата
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Успешно! Проверьте почту $TEST_EMAIL"
else
  echo "❌ Ошибка! Проверьте логи:"
  echo "   firebase functions:log --only sendParentalConsentOtp"
fi

