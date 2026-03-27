#!/bin/bash

# Скрипт для тестирования Email OTP

echo "🧪 Тестирование Email OTP отправки..."
echo ""

# Запрашиваем email для тестирования
if [ -z "$1" ]; then
  echo "Введите email для тестирования:"
  read TEST_EMAIL
else
  TEST_EMAIL="$1"
fi

# URL функции
FUNCTION_URL="https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp"

# Тестовые данные
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
  echo "   (Проверьте также папку 'Спам', если письмо не пришло)"
else
  echo "❌ Ошибка! Проверьте логи:"
  echo "   firebase functions:log --only sendParentalConsentOtp"
fi

