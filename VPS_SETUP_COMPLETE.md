# ✅ VPS настройка завершена!

## 🎉 Все готово к работе!

### ✅ Что установлено и настроено:

1. **PostgreSQL** - установлен и запущен
2. **База данных** - `uzbekservice_db` создана
3. **Пользователь БД** - `uzbekservice_user` создан
4. **Таблицы** - `users_sensitive` и `orders_sensitive` созданы
5. **Node.js** - установлен
6. **API сервер** - запущен на порту 3000
7. **Systemd service** - настроен автозапуск
8. **Firewall** - порт 3000 открыт

---

## 🌐 API доступен по адресу:

**Внутренний:** `http://localhost:3000`  
**Внешний:** `http://95.46.96.53:3000`

---

## 🔍 Проверка работы API

### Health check:

```bash
curl http://95.46.96.53:3000/health
```

Должен вернуть: `{"status":"ok","timestamp":"..."}`

### Проверка статуса службы:

```bash
systemctl status uzbekservice-api
```

### Просмотр логов:

```bash
journalctl -u uzbekservice-api -n 50
```

---

## 📋 Следующие шаги

### 1. Протестировать регистрацию в приложении

1. Откройте Flutter приложение
2. Зарегистрируйте нового пользователя (специалиста)
3. Укажите адрес при регистрации
4. Проверьте, что данные сохранились на VPS

### 2. Проверить данные на VPS

```bash
su - postgres -c "psql -d uzbekservice_db -c 'SELECT id, phone_number, address FROM users_sensitive;'"
```

### 3. Проверить API напрямую

```bash
curl -X POST http://95.46.96.53:3000/api/sensitive-user-data \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "phoneNumber": "+998901234567",
    "address": "Test Address",
    "latitude": 41.3111,
    "longitude": 69.2797
  }'
```

---

## 🔧 Управление API сервером

### Остановить:

```bash
systemctl stop uzbekservice-api
```

### Запустить:

```bash
systemctl start uzbekservice-api
```

### Перезапустить:

```bash
systemctl restart uzbekservice-api
```

### Просмотр логов:

```bash
journalctl -u uzbekservice-api -f
```

---

## 📊 Проверка БД

### Список таблиц:

```bash
su - postgres -c "psql -d uzbekservice_db -c '\dt'"
```

### Количество пользователей:

```bash
su - postgres -c "psql -d uzbekservice_db -c 'SELECT COUNT(*) FROM users_sensitive;'"
```

### Просмотр данных:

```bash
su - postgres -c "psql -d uzbekservice_db -c 'SELECT * FROM users_sensitive;'"
```

---

## 🎯 Готово к использованию!

Гибридная модель (Вариант 1) полностью настроена и работает!

- **Firebase** - для нечувствительных данных (имя, email, категория, описание)
- **PostgreSQL на VPS** - для чувствительных данных (телефон, адрес, координаты)

При регистрации пользователя данные автоматически сохраняются в оба места.

