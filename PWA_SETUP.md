# PWA Настройка для AsterAuto

## ✅ Что было сделано

### 1. **Manifest.json** (`web/manifest.json`)
- Обновлено название приложения на "AsterAuto"
- Настроены цвета темы: `#ff6b35` (акцент) и `#1a1a2e` (фон)
- Добавлены категории, язык, shortcuts
- Настроены иконки для PWA

### 2. **Service Worker** (`web/sw.js`)
- Создан service worker для офлайн работы
- Реализовано кэширование статических ресурсов
- Network First стратегия для HTML
- Cache First для изображений и скриптов
- Поддержка push-уведомлений
- Обработка кликов по уведомлениям

### 3. **Index.html** (`web/index.html`)
- Добавлена регистрация PWA service worker
- Обновлены meta-теги для PWA
- Обновлены цвета загрузочного экрана под брендинг AsterAuto
- Добавлен theme-color для браузеров

## 🚀 Как использовать

### Локальная разработка

1. **Соберите приложение:**
   ```bash
   cd /Users/dulatea/uzbekservice_app
   flutter build web
   ```

2. **Запустите локальный сервер:**
   ```bash
   cd build/web
   python3 -m http.server 8080
   # или
   npx serve -s . -l 8080
   ```

3. **Откройте в браузере:**
   - Chrome: `http://localhost:8080`
   - Проверьте в DevTools > Application > Service Workers

### Деплой на Firebase Hosting

1. **Соберите приложение:**
   ```bash
   flutter build web --release
   ```

2. **Деплой:**
   ```bash
   firebase deploy --only hosting
   ```

### Проверка PWA

1. **Chrome DevTools:**
   - Откройте DevTools (F12)
   - Вкладка "Application" > "Manifest" - проверьте manifest.json
   - Вкладка "Service Workers" - проверьте регистрацию SW
   - Вкладка "Lighthouse" - запустите аудит PWA

2. **Установка на устройство:**
   - **Android Chrome:** Появится баннер "Добавить на главный экран"
   - **iOS Safari:** Поделиться > "На экран «Домой»"
   - **Desktop Chrome:** Иконка в адресной строке > "Установить"

## 📱 Функции PWA

### ✅ Реализовано:
- ✅ Установка на главный экран
- ✅ Офлайн кэширование
- ✅ Быстрая загрузка
- ✅ Адаптивный дизайн
- ✅ Push-уведомления (готово к интеграции)
- ✅ Обновления в фоне

### 🔄 Что можно улучшить:
- Добавить больше размеров иконок (72x72, 96x96, 144x144)
- Настроить стратегию кэширования для API запросов
- Добавить офлайн страницу
- Реализовать синхронизацию данных в фоне

## 🎨 Цвета брендинга

- **Primary:** `#1a1a2e` (темно-синий)
- **Accent:** `#ff6b35` (оранжевый)
- **Background:** `#1a1a2e` (градиент)

## 📝 Примечания

- Service Worker не кэширует запросы к Firebase (для актуальности данных)
- Статические ресурсы кэшируются для быстрой загрузки
- При обновлении приложения новый SW активируется автоматически

## 🔧 Отладка

Если PWA не работает:

1. **Проверьте HTTPS:**
   - PWA требует HTTPS (кроме localhost)
   - Firebase Hosting автоматически предоставляет HTTPS

2. **Очистите кэш:**
   ```javascript
   // В консоли браузера
   caches.keys().then(names => names.forEach(name => caches.delete(name)))
   ```

3. **Перерегистрируйте Service Worker:**
   - DevTools > Application > Service Workers > Unregister
   - Обновите страницу

4. **Проверьте manifest.json:**
   - Должен быть доступен по `/manifest.json`
   - Все иконки должны существовать

## 📚 Дополнительные ресурсы

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Flutter Web PWA](https://docs.flutter.dev/deployment/web)

