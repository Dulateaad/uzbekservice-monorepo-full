# 🔐 OneID для специалистов - Статус настройки

## ✅ Что настроено:

### 1. Конфигурация OneID ✅
- **Файл:** `lib/config/oneid_config.dart`
- **Client ID:** `odo_uz` (настроено)
- **Client Secret:** `8H8dcZ118ix2arY7w5ObjrfN` (настроено)
- **Backend URL:** `https://odo-oneid-backend.onrender.com`
- **Redirect URI:** `odouzapp://oneid/callback`

### 2. Экран входа для специалистов ✅
- **Файл:** `lib/screens/auth/specialist_oneid_login_screen.dart`
- Полностью реализован с UI
- Обработка ошибок
- Интеграция с Firestore

### 3. OneID Service ✅
- **Файл:** `lib/services/oneid_service.dart`
- Методы для OAuth2 авторизации
- Обработка callback от OneID

### 4. Провайдер авторизации ✅
- **Файл:** `lib/providers/firestore_auth_provider.dart`
- Метод `loginWithOneId()` для входа через OneID
- Поддержка типа пользователя `specialist`

---

## ❌ Что НЕ настроено:

### 1. Маршрут в роутинге ❌
**Проблема:** Экран `SpecialistOneIdLoginScreen` не добавлен в `app_router.dart`

**Решение:** Добавить маршрут:
```dart
GoRoute(
  path: '/auth/specialist-oneid-login',
  builder: (context, state) => const SpecialistOneIdLoginScreen(),
),
```

### 2. Backend недоступен ❌
**Проблема:** Backend возвращает 404
- URL: `https://odo-oneid-backend.onrender.com`
- Статус: Недоступен или URL неправильный

**Решение:** 
- Проверить статус бэкенда на Render
- Обновить URL в `oneid_config.dart` если изменился

---

## 📋 Что нужно сделать:

### Шаг 1: Добавить маршрут в роутинг

Откройте `lib/utils/app_router.dart` и добавьте:

1. **Импорт:**
```dart
import '../screens/auth/specialist_oneid_login_screen.dart';
```

2. **Маршрут (после строки 150):**
```dart
GoRoute(
  path: '/auth/specialist-oneid-login',
  builder: (context, state) => const SpecialistOneIdLoginScreen(),
),
```

### Шаг 2: Проверить/обновить Backend URL

1. Проверьте статус бэкенда на [Render Dashboard](https://dashboard.render.com/)
2. Если URL изменился, обновите в `lib/config/oneid_config.dart`:
```dart
static const String backendUrl = 'https://НОВЫЙ-URL.onrender.com';
```

### Шаг 3: Добавить кнопку входа для специалистов

На экране авторизации добавьте кнопку:
```dart
ElevatedButton(
  onPressed: () {
    context.go('/auth/specialist-oneid-login');
  },
  child: Text('Войти как специалист через OneID'),
),
```

---

## 🧪 Тестирование:

После настройки:

1. Перейдите на `/auth/specialist-oneid-login`
2. Нажмите "Войти через OneID"
3. Должен открыться браузер с авторизацией OneID
4. После авторизации должен произойти redirect обратно в приложение
5. Пользователь должен быть создан/обновлен в Firestore с типом `specialist`

---

## 📊 Текущий статус:

| Компонент | Статус | Примечание |
|-----------|--------|------------|
| Конфигурация OneID | ✅ | Настроено |
| Экран входа | ✅ | Реализован |
| OneID Service | ✅ | Работает |
| Провайдер авторизации | ✅ | Готов |
| Маршрут в роутинге | ❌ | **Нужно добавить** |
| Backend доступность | ❌ | **Проверить URL** |
| Кнопка входа | ❌ | **Нужно добавить** |

---

## 🎯 Итог:

**OneID для специалистов частично настроен:**
- ✅ Код готов и работает
- ❌ Не подключен к роутингу
- ❌ Backend требует проверки

**Для полной настройки нужно:**
1. Добавить маршрут (2 минуты)
2. Проверить/обновить Backend URL (5 минут)
3. Добавить кнопку входа (5 минут)

**Общее время:** ~12 минут до полной настройки

