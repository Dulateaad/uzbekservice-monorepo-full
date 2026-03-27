# 🌐 Статус хостинга приложения

## 📱 Само приложение (Flutter Web)

### Хостинг: Firebase Hosting

**URL приложения:**
- **Основной:** `https://odo-uz-app.web.app`
- **Альтернативный:** `https://odo-uz-app.firebaseapp.com`

**Проект:** `odo-uz-app`

**Статус:** Настроено, но возможно не задеплоено

---

## 🔧 Конфигурация:

### Firebase Hosting (`firebase.json`):
```json
{
  "hosting": {
    "public": "build/web",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## 🚀 Как задеплоить приложение:

### Шаг 1: Сборка для Web
```bash
cd /Users/dulatea/uzbekservice_app
flutter build web --release
```

### Шаг 2: Деплой на Firebase Hosting
```bash
firebase deploy --only hosting
```

### Шаг 3: Проверка
После деплоя приложение будет доступно по адресу:
- `https://odo-uz-app.web.app`
- `https://odo-uz-app.firebaseapp.com`

---

## 📊 Текущий статус:

### Backend (Firebase Functions): ✅ Задеплоено
- Click Payment: ✅ Работает
- OneID: ✅ Работает
- URL: `https://us-central1-odo-uz-app.cloudfunctions.net`

### Frontend (Flutter Web App): ⚠️ Возможно не задеплоено
- Firebase Hosting настроен
- URL доступен: `https://odo-uz-app.web.app`
- Нужно собрать и задеплоить: `flutter build web --release && firebase deploy --only hosting`

---

## 🔍 Проверка деплоя:

### Проверить статус:
```bash
firebase hosting:sites:list
```

### Проверить доступность:
```bash
curl -I https://odo-uz-app.web.app
```

### Просмотреть в браузере:
Откройте: https://odo-uz-app.web.app

---

## 📝 Быстрый деплой:

Используйте скрипт:
```bash
./deploy.sh
```

Или вручную:
```bash
flutter build web --release
firebase deploy --only hosting
```

---

## ✅ Итог:

**Backend (Functions):** ✅ Задеплоено на Firebase Cloud Functions  
**Frontend (App):** ⚠️ Firebase Hosting настроен, но нужно собрать и задеплоить

**Для деплоя приложения выполните:**
```bash
flutter build web --release
firebase deploy --only hosting
```

