# 📱 Настройка Twilio для отправки SMS

## Шаг 1: Регистрация в Twilio

1. Перейдите на https://www.twilio.com/
2. Нажмите "Sign Up" и создайте аккаунт
3. Подтвердите email и телефон
4. Заполните информацию о компании (можно использовать тестовую)

## Шаг 2: Получение учетных данных

1. После регистрации перейдите в [Twilio Console](https://console.twilio.com/)
2. На главной странице вы увидите:
   - **Account SID** - скопируйте его
   - **Auth Token** - нажмите "View" чтобы увидеть (скопируйте)

## Шаг 3: Покупка номера телефона

1. В Twilio Console перейдите в **Phone Numbers** → **Buy a number**
2. Выберите страну (Узбекистан или Казахстан)
3. Выберите тип: **SMS** или **SMS + Voice**
4. Купите номер (стоимость ~$1-2/месяц)

## Шаг 4: Настройка в приложении

### Вариант 1: Прямая настройка (для тестирования)

Откройте `lib/services/twilio_sms_service.dart` и замените:

```dart
static const String _accountSid = 'YOUR_ACCOUNT_SID'; // Ваш Account SID
static const String _authToken = 'YOUR_AUTH_TOKEN'; // Ваш Auth Token
static const String _twilioNumber = '+1234567890'; // Ваш Twilio номер
```

### Вариант 2: Через Firebase Functions (рекомендуется для продакшена)

1. Создайте Firebase Function для отправки SMS
2. Храните учетные данные в Firebase Functions Environment Variables
3. Вызывайте функцию из приложения

Пример функции:
```javascript
// functions/index.js
const functions = require('firebase-functions');
const twilio = require('twilio');

const accountSid = functions.config().twilio.account_sid;
const authToken = functions.config().twilio.auth_token;
const twilioNumber = functions.config().twilio.phone_number;

const client = twilio(accountSid, authToken);

exports.sendSmsCode = functions.https.onCall(async (data, context) => {
  const { phoneNumber, code } = data;
  
  try {
    const message = await client.messages.create({
      body: `ODO.UZ: Ваш код подтверждения: ${code}`,
      from: twilioNumber,
      to: phoneNumber,
    });
    
    return { success: true, sid: message.sid };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

## Шаг 5: Тестирование

1. Используйте тестовые учетные данные Twilio для разработки
2. Проверьте отправку SMS на реальный номер
3. Убедитесь, что код сохраняется в Firestore

## Стоимость

- **Узбекистан:** ~$0.0075 за SMS
- **Казахстан:** ~$0.05 за SMS
- **Номер телефона:** ~$1-2/месяц

## Безопасность

⚠️ **ВАЖНО:** Не коммитьте учетные данные в Git!

1. Используйте `.env` файл (добавьте в `.gitignore`)
2. Или используйте Firebase Functions Environment Variables
3. Или используйте Firebase Secrets Manager

## Использование в коде

```dart
import 'package:odo_uz_app/services/twilio_sms_service.dart';

final twilioService = TwilioSmsService();

// Отправка SMS
final result = await twilioService.sendSmsCode('+998901234567');
if (result['success'] == true) {
  print('SMS отправлен!');
} else {
  print('Ошибка: ${result['error']}');
}

// Проверка кода
final isValid = await twilioService.verifySmsCode('+998901234567', '123456');
if (isValid) {
  print('Код верный!');
}
```

## Ограничения

- **Тестовый аккаунт:** Можно отправлять SMS только на верифицированные номера
- **Продакшен:** После верификации аккаунта можно отправлять на любые номера
- **Лимиты:** Зависит от тарифа Twilio

## Поддержка

- Документация: https://www.twilio.com/docs
- Поддержка: https://support.twilio.com/

