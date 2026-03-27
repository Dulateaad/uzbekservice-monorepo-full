# 🔐 Инструкция по входу в Firebase

## ✅ Выполнено:

- ✅ Вышли из аккаунта `dulatiensenov@gmail.com`

---

## 📋 Следующие шаги:

### 1. Войдите в правильный аккаунт Firebase

Выполните в терминале:

```bash
firebase login
```

Откроется браузер для авторизации. **Войдите в аккаунт, который имеет доступ к проекту `odo-uz-1f4d9`**

### 2. Проверьте список проектов

После входа выполните:

```bash
firebase projects:list
```

Убедитесь, что в списке есть проект `odo-uz-1f4d9`

### 3. Переключитесь на проект

```bash
firebase use odo-uz-1f4d9
```

### 4. Проверьте доступ

```bash
firebase hosting:sites:list
```

Должен показать сайт `odo-uz-1f4d9`

### 5. Задеплойте приложение

```bash
# Сборка уже готова, но можно пересобрать для уверенности
flutter build web --release

# Деплой
firebase deploy --only hosting
```

---

## 🔍 После деплоя проверьте:

- ✅ `https://odo-uz-1f4d9.web.app/` - главная страница
- ✅ `https://odo-uz-1f4d9.web.app/privacy-policy.html` - политика конфиденциальности
- ✅ `https://odo-uz-1f4d9.web.app/terms-of-service.html` - условия использования

---

**Выполните команду `firebase login` в терминале и войдите в правильный аккаунт!**

