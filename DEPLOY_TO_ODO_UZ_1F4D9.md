# 🚀 Деплой на odo-uz-1f4d9.web.app

## 📋 Текущая ситуация:

**Целевой проект:** `odo-uz-1f4d9`  
**URL:** `https://odo-uz-1f4d9.web.app/`  
**Play Store URL:** `https://odo-uz-1f4d9.web.app/privacy-policy.html`

**Проблема:** Проект существует, но у текущего аккаунта нет доступа (403 Permission denied)

---

## ✅ Решение:

### Вариант 1: Войти в правильный аккаунт Firebase

1. **Выйдите из текущего аккаунта:**
   ```bash
   firebase logout
   ```

2. **Войдите в аккаунт, который имеет доступ к проекту `odo-uz-1f4d9`:**
   ```bash
   firebase login
   ```
   Откроется браузер - войдите в правильный аккаунт.

3. **Проверьте доступ к проекту:**
   ```bash
   firebase projects:list
   ```
   Должен появиться проект `odo-uz-1f4d9`

4. **Переключитесь на проект:**
   ```bash
   firebase use odo-uz-1f4d9
   ```

5. **Задеплойте:**
   ```bash
   flutter build web --release
   firebase deploy --only hosting
   ```

---

### Вариант 2: Добавить проект вручную

Если проект существует, но не отображается в списке:

1. **Добавьте проект в `.firebaserc`:**
   ```json
   {
     "projects": {
       "default": "odo-uz-app",
       "production": "odo-uz-1f4d9"
     }
   }
   ```

2. **Попробуйте использовать:**
   ```bash
   firebase use production
   ```

---

### Вариант 3: Запросить доступ к проекту

Если проект принадлежит другому аккаунту:

1. Попросите владельца проекта добавить ваш email в Firebase Console
2. После получения доступа выполните шаги из Варианта 1

---

## 🔍 Проверка:

После успешного деплоя проверьте:
- ✅ `https://odo-uz-1f4d9.web.app/` - главная страница
- ✅ `https://odo-uz-1f4d9.web.app/privacy-policy.html` - политика конфиденциальности
- ✅ `https://odo-uz-1f4d9.web.app/terms-of-service.html` - условия использования

---

## 📝 Текущий статус:

- ✅ **Сборка готова:** `build/web` собран
- ❌ **Доступ к проекту:** Нет (403 Permission denied)
- ⚠️ **Действие:** Нужно войти в правильный аккаунт Firebase

---

**После входа в правильный аккаунт выполните:**
```bash
firebase use odo-uz-1f4d9
firebase deploy --only hosting
```

