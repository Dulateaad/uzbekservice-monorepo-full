# 🔑 Как получить Google Maps API ключ

## 📋 Пошаговая инструкция:

### Шаг 1: Откройте Google Cloud Console

1. Перейдите: https://console.cloud.google.com
2. Войдите в свой Google аккаунт
3. Убедитесь, что выбран проект **odo-uz-1f4d9** (вверху слева, рядом с логотипом Google Cloud)

### Шаг 2: Перейдите в раздел Credentials (Учетные данные)

**Способ 1 - Прямая ссылка:**
https://console.cloud.google.com/apis/credentials?project=odo-uz-1f4d9

**Способ 2 - Через меню:**
1. В левом меню найдите **"APIs & Services"** (API и сервисы)
2. Нажмите **"Credentials"** (Учетные данные)

### Шаг 3: Создайте API ключ

1. Вверху страницы нажмите кнопку **"+ CREATE CREDENTIALS"** (Создать учетные данные)
2. Выберите **"API key"** (API ключ)
3. Ключ будет создан автоматически и отобразится в списке

### Шаг 4: Скопируйте ключ

1. Найдите созданный ключ в списке
2. Нажмите на него, чтобы открыть настройки
3. Скопируйте значение ключа (начинается с `AIzaSy...`)
4. **Важно:** Сохраните ключ в безопасном месте!

### Шаг 5: Настройте ограничения (рекомендуется)

**Это важно для безопасности!**

#### A. Ограничения API:

1. В разделе **"API restrictions"** выберите **"Restrict key"**
2. В списке **"Select APIs"** выберите только нужные:
   - ✅ **Maps JavaScript API** (обязательно)
   - ✅ **Places API** (обязательно)
   - ✅ **Geocoding API** (опционально)
3. Нажмите **"Save"**

#### B. Ограничения приложений:

1. В разделе **"Application restrictions"** выберите **"HTTP referrers (web sites)"**
2. В разделе **"Website restrictions"** нажмите **"Add an item"**
3. Добавьте домены (по одному на строку):
   ```
   https://odo-uz-1f4d9.web.app/*
   https://odo-uz-1f4d9.firebaseapp.com/*
   http://localhost:*
   http://127.0.0.1:*
   ```
4. Нажмите **"Save"**

### Шаг 6: Обновите ключ в коде

После получения ключа нужно обновить его в проекте:

#### A. В файле `web/index.html`:

Найдите строку (около строки 213):
```javascript
script.src = `https://maps.googleapis.com/maps/api/js?key=ВАШ_СТАРЫЙ_КЛЮЧ&libraries=places,marker&loading=async&callback=${callbackName}`;
```

Замените `ВАШ_СТАРЫЙ_КЛЮЧ` на новый ключ:
```javascript
script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSy...ВАШ_НОВЫЙ_КЛЮЧ&libraries=places,marker&loading=async&callback=${callbackName}`;
```

#### B. В файле `lib/services/google_maps_service_web.dart`:

Найдите функцию (около строки 462):
```dart
static String getGoogleMapsApiKey() {
  return 'ВАШ_СТАРЫЙ_КЛЮЧ';
}
```

Замените на:
```dart
static String getGoogleMapsApiKey() {
  return 'AIzaSy...ВАШ_НОВЫЙ_КЛЮЧ';
}
```

#### C. В файле `lib/services/google_maps_service_stub.dart`:

Также обновите ключ в функции `getGoogleMapsApiKey()` (около строки 65).

### Шаг 7: Включите необходимые API

**Важно!** После создания ключа нужно включить API:

1. **Maps JavaScript API:**
   - https://console.cloud.google.com/apis/library/maps-javascript-api.googleapis.com?project=odo-uz-1f4d9
   - Нажмите **"Enable"**

2. **Places API:**
   - https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=odo-uz-1f4d9
   - Нажмите **"Enable"**

3. **Geocoding API** (опционально):
   - https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=odo-uz-1f4d9
   - Нажмите **"Enable"**

### Шаг 8: Проверьте работу

1. Сохраните все файлы
2. Пересоберите проект: `flutter build web --release`
3. Задеплойте: `firebase deploy --only hosting`
4. Откройте https://odo-uz-1f4d9.web.app
5. Перейдите на экран карт
6. Убедитесь, что карта загружается

## ⚠️ Важные моменты:

### Безопасность:

1. **НЕ коммитьте ключ в публичные репозитории**
2. **Используйте ограничения по доменам** (шаг 5)
3. **Ограничьте API** только нужными (шаг 5A)
4. **Для продакшена используйте разные ключи** для dev/prod

### Лимиты и стоимость:

- **Бесплатный план**: 28,000 загрузок карт в месяц
- **После лимита**: $7 за 1000 загрузок
- **Places API**: $17 за 1000 запросов (после бесплатного лимита)

### Текущий ключ в проекте:

В проекте уже используется ключ: `AIzaSyChdT2U33lGtXsUa92_D8NauTNALaSaN0I`

**Если создаете новый ключ**, замените его во всех местах (см. Шаг 6).

## 🔗 Полезные ссылки:

- **Credentials (Учетные данные)**: https://console.cloud.google.com/apis/credentials?project=odo-uz-1f4d9
- **API Library (Библиотека API)**: https://console.cloud.google.com/apis/library?project=odo-uz-1f4d9
- **Dashboard (Панель управления)**: https://console.cloud.google.com/apis/dashboard?project=odo-uz-1f4d9

## ❓ Частые вопросы:

**Q: Где найти существующий ключ?**
A: https://console.cloud.google.com/apis/credentials?project=odo-uz-1f4d9 - в списке всех ключей

**Q: Как удалить ключ?**
A: В списке ключей нажмите на ключ → "Delete" → Подтвердите удаление

**Q: Ключ не работает, что делать?**
A: 
1. Убедитесь, что API включены (Шаг 7)
2. Проверьте ограничения по доменам (Шаг 5B)
3. Подождите 2-5 минут после создания/изменения
4. Очистите кеш браузера

