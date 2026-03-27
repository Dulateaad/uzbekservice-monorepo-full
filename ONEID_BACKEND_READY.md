# ✅ OneID Backend - Готов к деплою!

## 📦 Что создано:

### Структура бэкенда:
```
server-oneid/
├── server.js          # Основной сервер с endpoints
├── package.json       # Зависимости и скрипты
├── .gitignore        # Игнорируемые файлы
├── README.md         # Документация
├── DEPLOY_RENDER.md  # Инструкция по деплою
└── ENV_SETUP.md      # Настройка переменных окружения
```

### Реализованные endpoints:

1. **GET /health** - Проверка работоспособности
2. **GET /api/oneid/login** - Редирект на OneID авторизацию
3. **POST /api/oneid/callback** - Обмен кода на токен
4. **GET /api/oneid/user** - Получение данных пользователя

---

## 🚀 Следующие шаги:

### 1. Установите зависимости (локально для теста):

```bash
cd /Users/dulatea/uzbekservice_app/server-oneid
npm install
```

### 2. Протестируйте локально (опционально):

```bash
npm start
```

Откройте в браузере: `http://localhost:3000/health`

### 3. Закоммитьте и запушьте в Git:

```bash
cd /Users/dulatea/uzbekservice_app
git add server-oneid/
git commit -m "Add OneID backend server"
git push
```

### 4. Задеплойте на Render:

Следуйте инструкции в файле: `server-oneid/DEPLOY_RENDER.md`

**Краткая версия:**
1. Зайдите на [Render Dashboard](https://dashboard.render.com/)
2. Создайте новый Web Service
3. Подключите ваш GitHub репозиторий
4. Настройте:
   - **Root Directory:** `server-oneid`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Добавьте Environment Variables (см. `ENV_SETUP.md`)
6. Создайте сервис и дождитесь деплоя

### 5. Обновите конфигурацию в приложении:

После получения URL от Render, обновите `lib/config/oneid_config.dart`:

```dart
static const String backendUrl = 'https://ВАШ-НОВЫЙ-URL.onrender.com';
```

---

## ✅ Проверка работоспособности:

После деплоя проверьте:

```bash
# Health check
curl https://ваш-url.onrender.com/health

# Должен вернуться:
# {"status":"ok","timestamp":"..."}
```

---

## 📝 Важные замечания:

1. **Environment Variables:**
   - На Render добавьте все переменные из `ENV_SETUP.md`
   - `client_secret` должен храниться только на сервере

2. **Root Directory:**
   - Убедитесь, что в Render указан `server-oneid` как Root Directory

3. **Sleep Mode:**
   - На бесплатном плане Render сервис "засыпает" после 15 минут бездействия
   - Первый запрос после сна может занять 30-60 секунд

4. **OneID URLs:**
   - Бэкенд использует официальные OneID endpoints
   - Если они изменятся, обновите в `server.js`

---

## 🎯 Готово!

После деплоя ваш бэкенд будет готов к использованию в приложении. OneID авторизация для специалистов заработает полностью!

---

**Время до деплоя:** ~10-15 минут  
**Сложность:** Легко (просто следуйте инструкции)

