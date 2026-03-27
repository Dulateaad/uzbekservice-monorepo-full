# Настройка OneID интеграции

## Текущая конфигурация

OneID credentials уже настроены в приложении:

- **Client ID:** `odo_uz`
- **Client Secret:** `8H8dcZ118ix2arY7w5ObjrfN`

⚠️ **ВАЖНО:** Эти credentials хранятся в коде как значения по умолчанию. Для production рекомендуется использовать environment variables или Firebase Remote Config.

## Где хранятся credentials

Файл: `lib/config/oneid_config.dart`

```dart
static const String clientId = String.fromEnvironment(
  'ONEID_CLIENT_ID',
  defaultValue: 'odo_uz',  // ✅ Уже настроено
);

static const String clientSecret = String.fromEnvironment(
  'ONEID_CLIENT_SECRET',
  defaultValue: '8H8dcZ118ix2arY7w5ObjrfN',  // ✅ Уже настроено
);
```

## Использование через Environment Variables (рекомендуется для production)

### Для Flutter Web:

```bash
flutter build web --release \
  --dart-define=ONEID_CLIENT_ID=odo_uz \
  --dart-define=ONEID_CLIENT_SECRET=8H8dcZ118ix2arY7w5ObjrfN
```

### Для Flutter iOS/Android:

Создайте файл `.env` в корне проекта:
```
ONEID_CLIENT_ID=odo_uz
ONEID_CLIENT_SECRET=8H8dcZ118ix2arY7w5ObjrfN
```

И используйте пакет `flutter_dotenv` для загрузки.

## Backend URL

Текущий backend URL: `https://odo-oneid-backend.onrender.com`

Endpoints:
- Login: `https://odo-oneid-backend.onrender.com/api/oneid/login`
- Callback: `https://odo-oneid-backend.onrender.com/api/oneid/callback`
- User Info: `https://odo-oneid-backend.onrender.com/api/oneid/user`

## Redirect URI

- Scheme: `odouzapp`
- Full URI: `odouzapp://oneid/callback`

## Безопасность

⚠️ **КРИТИЧНО:**
- `client_secret` - это секретный ключ, не передавайте его третьим лицам
- В production используйте серверные endpoints для обмена кода на токен
- Не храните `client_secret` в клиентском коде для production приложений
- Используйте Firebase Remote Config или серверные переменные окружения

## Проверка конфигурации

В коде есть метод для проверки:

```dart
if (OneIdConfig.isConfigured) {
  // Конфигурация готова
} else {
  // Конфигурация не настроена
}
```

## Тестирование

1. Убедитесь, что backend доступен
2. Проверьте, что redirect URI зарегистрирован в OneID
3. Протестируйте авторизацию через OneID в приложении

## Troubleshooting

### Ошибка: "Client ID not found"
- Проверьте, что `clientId` правильный: `odo_uz`
- Убедитесь, что credentials не перезаписаны environment variables

### Ошибка: "Invalid client secret"
- Проверьте, что `clientSecret` правильный: `8H8dcZ118ix2arY7w5ObjrfN`
- Убедитесь, что нет лишних пробелов или символов

### Ошибка: "Redirect URI mismatch"
- Проверьте, что redirect URI в OneID настроен как: `odouzapp://oneid/callback`
- Убедитесь, что scheme `odouzapp` зарегистрирован в приложении

### Backend недоступен
- Проверьте, что `https://odo-oneid-backend.onrender.com` доступен
- Убедитесь, что backend правильно настроен и работает

## Контакты

Если возникли проблемы с OneID:
- Рискибек Рустамов
- Ведущий эксперт
- Телефон: (55) 501 36 06 (1118)
- Проекты цифрового правительства
- Центр управления

