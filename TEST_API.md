# Тестирование API

## ✅ API работает!

### Health Check

```bash
curl http://95.46.96.53:3000/health
```

Должен вернуть:
```json
{"status":"ok","timestamp":"2026-01-29T..."}
```

---

## 📊 База данных пустая - это нормально!

Если `SELECT` не вернул результатов - это нормально. Пользователи еще не регистрировались через приложение.

---

## 🧪 Тестирование API

### 1. Тест сохранения данных

```bash
curl -X POST http://95.46.96.53:3000/api/sensitive-user-data \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "phoneNumber": "+998901234567",
    "address": "Ташкент, ул. Тестовая, 1",
    "latitude": 41.3111,
    "longitude": 69.2797
  }'
```

Должен вернуть:
```json
{
  "id": "test123",
  "phone_number": "+998901234567",
  "address": "Ташкент, ул. Тестовая, 1",
  "location": "{\"lat\":41.3111,\"lng\":69.2797,\"address\":\"Ташкент, ул. Тестовая, 1\"}",
  ...
}
```

### 2. Проверка сохраненных данных

```bash
su - postgres -c "psql -d uzbekservice_db -c 'SELECT id, phone_number, address FROM users_sensitive;'"
```

Теперь должны быть видны данные.

### 3. Тест получения данных

```bash
curl http://95.46.96.53:3000/api/sensitive-user-data/test123
```

Должен вернуть данные пользователя.

---

## 📱 Тестирование через приложение

1. Откройте Flutter приложение
2. Зарегистрируйте нового специалиста
3. Укажите адрес при регистрации
4. Проверьте данные на VPS:

```bash
su - postgres -c "psql -d uzbekservice_db -c 'SELECT * FROM users_sensitive;'"
```

---

## 🔍 Проверка логов API

Если что-то не работает, проверьте логи:

```bash
journalctl -u uzbekservice-api -n 50
```

Или в реальном времени:

```bash
journalctl -u uzbekservice-api -f
```

---

## ✅ Готово к использованию!

API полностью настроен и готов принимать данные от Flutter приложения.

