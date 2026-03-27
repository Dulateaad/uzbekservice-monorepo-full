# Настройка Cloudflare Turnstile

Cloudflare Turnstile — бесплатная альтернатива reCAPTCHA для защиты от ботов.

## 📋 Шаги настройки

### 1. Создайте аккаунт Cloudflare (бесплатно)

1. Перейдите на https://dash.cloudflare.com/sign-up
2. Зарегистрируйтесь с email

### 2. Создайте Turnstile Widget

1. Войдите в Cloudflare Dashboard: https://dash.cloudflare.com/
2. В левом меню выберите **Turnstile**
3. Нажмите **Add Site**
4. Заполните:
   - **Site name**: `ODO.UZ` (любое название)
   - **Domain**: `odo-uz-1f4d9.web.app` (ваш домен)
   - **Widget Mode**: `Managed` (рекомендуется)
5. Нажмите **Create**

### 3. Получите ключи

После создания вы получите:
- **Site Key** (публичный) — для фронтенда
- **Secret Key** (приватный) — для бэкенда (опционально)

### 4. Обновите код

Замените Site Key в файле `lib/services/cloudflare_turnstile_service.dart`:

```dart
static const String _siteKey = 'ВАШ_SITE_KEY_ЗДЕСЬ';
```

### 5. Деплой

```bash
cd /Users/dulatea/uzbekservice_app
flutter build web
firebase deploy --only hosting
```

---

## 🔧 Дополнительные настройки

### Добавить несколько доменов

В Cloudflare Dashboard -> Turnstile -> ваш виджет -> Settings:
- Добавьте `localhost` для локальной разработки
- Добавьте все ваши домены

### Widget Mode

- **Managed** — Cloudflare автоматически решает показывать ли challenge
- **Non-interactive** — Невидимая проверка
- **Invisible** — Полностью невидимая

---

## 🔒 Серверная верификация (опционально)

Для максимальной безопасности проверяйте токен на сервере:

### VPS API (Node.js)

```javascript
// Добавьте в vps_api_server.js
app.post('/api/verify-turnstile', async (req, res) => {
  const { token } = req.body;
  
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=ВАШ_SECRET_KEY&response=${token}`
  });
  
  const result = await response.json();
  res.json({ success: result.success });
});
```

---

## ✅ Проверка работы

1. Откройте приложение: https://odo-uz-1f4d9.web.app
2. Перейдите на страницу входа
3. Должен появиться виджет Cloudflare Turnstile
4. После прохождения проверки станет доступна кнопка "Отправить SMS"

---

## 🆓 Преимущества Turnstile

| Функция | Turnstile | reCAPTCHA |
|---------|-----------|-----------|
| Цена | Бесплатно | Бесплатно (с ограничениями) |
| Приватность | Не собирает данные | Собирает данные |
| Скорость | Быстрый | Медленнее |
| UX | Часто невидимый | Часто требует действий |

