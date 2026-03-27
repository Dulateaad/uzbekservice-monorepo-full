# 🚀 Быстрый тест PWA

## ✅ Что настроено

1. **Manifest.json** - конфигурация PWA приложения
2. **Service Worker (sw.js)** - кэширование и офлайн режим + Firebase Messaging
3. **Meta-теги** - для установки на главный экран
4. **Цвета брендинга** - AsterAuto (#ff6b35, #1a1a2e)

## 🧪 Как протестировать

### 1. Соберите приложение
```bash
cd /Users/dulatea/uzbekservice_app
flutter build web --release
```

### 2. Запустите локальный сервер
```bash
cd build/web
python3 -m http.server 8080
```

### 3. Откройте в Chrome
- Перейдите на `http://localhost:8080`
- Откройте DevTools (F12)
- Вкладка **Application** > **Manifest** - проверьте, что manifest загружен
- Вкладка **Application** > **Service Workers** - проверьте, что SW зарегистрирован

### 4. Проверьте установку PWA
- **Chrome Desktop:** В адресной строке появится иконка установки
- **Chrome Mobile:** Появится баннер "Добавить на главный экран"
- **iOS Safari:** Поделиться > "На экран «Домой»"

### 5. Lighthouse аудит
- DevTools > **Lighthouse** > Выберите "Progressive Web App"
- Запустите аудит
- Должен быть минимум 90+ баллов

## 📱 Что должно работать

✅ Установка на главный экран  
✅ Офлайн кэширование (после первой загрузки)  
✅ Быстрая загрузка (кэшированные ресурсы)  
✅ Push-уведомления (через Firebase)  
✅ Обновления в фоне  

## 🔧 Если что-то не работает

1. **Очистите кэш браузера**
2. **Перерегистрируйте Service Worker:**
   - DevTools > Application > Service Workers > Unregister
   - Обновите страницу
3. **Проверьте HTTPS** (для production, localhost работает без HTTPS)

## 📝 Примечания

- Service Worker объединяет PWA функции и Firebase Messaging
- Старые файлы `firebase-messaging-sw.js` можно оставить для совместимости
- При обновлении приложения новый SW активируется автоматически

