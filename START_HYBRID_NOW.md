# 🚀 Начните здесь: Гибридная модель (Вариант 1)

## ✅ Что уже готово

- ✅ VPS настроен (95.46.96.53)
- ✅ Flutter приложение обновлено
- ✅ VpsApiService создан
- ✅ Интеграция в провайдер добавлена
- ✅ Все скрипты и файлы готовы

## 📋 Что нужно сделать СЕЙЧАС

### Шаг 1: Установите PostgreSQL на VPS

**В VNC терминале или через SSH выполните:**

```bash
# Установка PostgreSQL
dnf install -y postgresql15-server postgresql15
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql

# Создание БД
su - postgres
createdb uzbekservice_db
createuser uzbekservice_user
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'Uzbekservice2026!Secure';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"
exit
```

### Шаг 2: Создайте таблицы

**Загрузите SQL файл на VPS:**

```bash
# С локального компьютера:
scp vps_create_tables.sql root@95.46.96.53:/root/
```

**На VPS:**

```bash
su - postgres
psql -U uzbekservice_user -d uzbekservice_db -f /root/vps_create_tables.sql
exit
```

### Шаг 3: Установите Node.js

```bash
# На VPS:
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
```

### Шаг 4: Настройте API сервер

**Загрузите файлы:**

```bash
# С локального компьютера:
scp vps_api_server.js vps_api_package.json root@95.46.96.53:/var/www/api/
```

**На VPS:**

```bash
cd /var/www/api
npm install

# Создайте .env
nano .env
```

Вставьте:
```
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026!Secure
DB_PORT=5432
NODE_ENV=production
```

**Запустите API:**

```bash
# Тестовый запуск
node vps_api_server.js

# Если работает, создайте systemd service (см. vps_api_setup.sh)
```

### Шаг 5: Проверьте работу

```bash
# С VPS или локального компьютера:
curl http://95.46.96.53:3000/health
```

Должен вернуть: `{"status":"ok","timestamp":"..."}`

## 🎯 Как это работает

### При регистрации нового пользователя:

1. **Чувствительные данные** (телефон, адрес, локация) → **VPS (PostgreSQL)**
2. **Нечувствительные данные** (имя, email, рейтинг) → **Firebase**

### При входе:

1. Проверка SMS кода через Twilio
2. Поиск пользователя в Firebase (нечувствительные данные)
3. Загрузка чувствительных данных с VPS (если нужно)

## 📊 Структура данных

### VPS (PostgreSQL) - `users_sensitive`:
- `id` - ID пользователя
- `phone_number` - номер телефона
- `address` - адрес
- `location` - координаты {lat, lng, address}
- `is_uzbek_citizen` - гражданин Узбекистана

### Firebase - `users`:
- `id` - ID пользователя
- `name` - имя
- `email` - email
- `category` - категория
- `rating` - рейтинг
- `totalOrders` - количество заказов
- **БЕЗ** location, phone_number (чувствительные)

## ✅ После настройки

1. **Протестируйте регистрацию:**
   - Зарегистрируйте нового пользователя
   - Проверьте данные на VPS: `psql -U uzbekservice_user -d uzbekservice_db -c "SELECT * FROM users_sensitive;"`
   - Проверьте данные в Firebase

2. **Мигрируйте существующие данные** (опционально)

3. **Зарегистрируйте БД** в Государственном регистре

## 📚 Документация

- **STEP_BY_STEP_HYBRID.md** - подробная пошаговая инструкция
- **HYBRID_QUICK_START.md** - быстрый старт
- **HYBRID_MODEL_IMPLEMENTATION.md** - описание архитектуры

## 🆘 Если что-то не работает

1. Проверьте статус PostgreSQL: `systemctl status postgresql`
2. Проверьте статус API: `systemctl status uzbekservice-api`
3. Проверьте логи: `journalctl -u uzbekservice-api -f`
4. Проверьте подключение к БД: `psql -U uzbekservice_user -d uzbekservice_db`

## 🎉 Готово!

После выполнения всех шагов ваше приложение будет соответствовать требованиям законодательства Узбекистана!

