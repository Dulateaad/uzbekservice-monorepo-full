# Пошаговая инструкция: Гибридная модель (Вариант 1)

## 🎯 Что мы делаем

Настраиваем гибридную модель:
- **Чувствительные данные** → VPS в Узбекистане (PostgreSQL)
- **Нечувствительные данные** → Firebase (за рубежом)

## 📋 Шаг 1: Установка PostgreSQL на VPS

### В VNC терминале или через SSH выполните:

```bash
# 1. Установка
dnf install -y postgresql15-server postgresql15

# 2. Инициализация
postgresql-setup --initdb

# 3. Запуск
systemctl start postgresql
systemctl enable postgresql

# 4. Проверка
systemctl status postgresql
```

### Создание БД и пользователя:

```bash
# Переключение на пользователя postgres
su - postgres

# Создание БД
createdb uzbekservice_db

# Создание пользователя
createuser uzbekservice_user

# Установка пароля
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'Uzbekservice2026!Secure';"

# Предоставление прав
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"

# Выход
exit
```

## 📋 Шаг 2: Создание таблиц

### Загрузите SQL файл на VPS:

```bash
# С локального компьютера:
scp vps_create_tables.sql root@95.46.96.53:/root/
```

### На VPS выполните:

```bash
# Подключение к БД
su - postgres
psql -U uzbekservice_user -d uzbekservice_db -f /root/vps_create_tables.sql
exit
```

## 📋 Шаг 3: Установка Node.js

```bash
# На VPS:
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# Проверка
node --version
npm --version
```

## 📋 Шаг 4: Настройка API сервера

### Загрузите файлы на VPS:

```bash
# С локального компьютера:
scp vps_api_server.js vps_api_package.json root@95.46.96.53:/var/www/api/
```

### На VPS:

```bash
# Создание директории
mkdir -p /var/www/api
cd /var/www/api

# Установка зависимостей
npm install

# Создание .env файла
nano .env
```

Вставьте в .env:
```
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026!Secure
DB_PORT=5432
NODE_ENV=production
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

### Запуск API:

```bash
# Тестовый запуск
node vps_api_server.js

# Если работает, нажмите Ctrl+C и создайте systemd service
```

### Создание systemd service:

```bash
nano /etc/systemd/system/uzbekservice-api.service
```

Вставьте:
```
[Unit]
Description=Uzbekservice API Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/api
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /var/www/api/vps_api_server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Запуск сервиса
systemctl daemon-reload
systemctl start uzbekservice-api
systemctl enable uzbekservice-api

# Проверка
systemctl status uzbekservice-api
```

### Настройка firewall:

```bash
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
```

## 📋 Шаг 5: Проверка API

```bash
# С VPS или локального компьютера:
curl http://95.46.96.53:3000/health

# Должен вернуть: {"status":"ok","timestamp":"..."}
```

## 📋 Шаг 6: Обновление Flutter приложения

### Уже создано:
- ✅ `lib/services/vps_api_service.dart` - сервис для работы с VPS API
- ✅ Обновлен `firestore_auth_provider.dart` - интеграция с VPS

### Что нужно сделать:

1. **Проверить работу:**
   - При регистрации чувствительные данные сохраняются на VPS
   - Нечувствительные данные остаются в Firebase

2. **Тестирование:**
   - Зарегистрировать нового пользователя
   - Проверить данные на VPS
   - Проверить данные в Firebase

## 📋 Шаг 7: Миграция существующих данных

После настройки можно мигрировать существующие данные из Firebase в PostgreSQL.

## ✅ Готово!

После выполнения всех шагов:
- ✅ PostgreSQL работает
- ✅ API сервер доступен
- ✅ Приложение обновлено
- ✅ Данные сохраняются в правильных местах

## 🔄 Следующие шаги

1. Протестировать регистрацию
2. Мигрировать существующие данные
3. Зарегистрировать БД в Государственном регистре

