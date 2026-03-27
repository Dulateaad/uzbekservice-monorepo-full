# Быстрый старт: Гибридная модель (Вариант 1)

## 🎯 Цель

Настроить гибридную модель: чувствительные данные на VPS в Узбекистане, остальные в Firebase.

## 📋 Шаг 1: Установка PostgreSQL на VPS

### Вариант A: Через VNC терминал

1. Войдите в VNC консоль
2. Выполните команды:

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

### Вариант B: Использовать скрипт

```bash
# Загрузите скрипт на VPS
scp vps_setup_postgresql.sh root@95.46.96.53:/root/

# На VPS выполните:
ssh root@95.46.96.53
bash /root/vps_setup_postgresql.sh
```

## 📋 Шаг 2: Создание таблиц

```bash
# На VPS:
# Загрузите SQL файл
scp vps_create_tables.sql root@95.46.96.53:/root/

# На VPS выполните:
su - postgres
psql -U uzbekservice_user -d uzbekservice_db -f /root/vps_create_tables.sql
exit
```

## 📋 Шаг 3: Настройка API сервера

### 3.1. Установка Node.js

```bash
# На VPS:
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
```

### 3.2. Загрузка файлов API

```bash
# С локального компьютера:
scp vps_api_server.js vps_api_package.json root@95.46.96.53:/var/www/api/
```

### 3.3. Установка зависимостей

```bash
# На VPS:
cd /var/www/api
npm install
```

### 3.4. Создание .env файла

```bash
# На VPS:
nano /var/www/api/.env
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

### 3.5. Запуск API

```bash
# На VPS:
# Используйте скрипт или вручную:
bash vps_api_setup.sh

# Или вручную:
node /var/www/api/vps_api_server.js
```

## 📋 Шаг 4: Проверка работы API

```bash
# С локального компьютера или VPS:
curl http://95.46.96.53:3000/health

# Должен вернуть:
# {"status":"ok","timestamp":"..."}
```

## 📋 Шаг 5: Настройка Nginx для API

```bash
# На VPS:
nano /etc/nginx/conf.d/api.conf
```

Вставьте:
```nginx
server {
    listen 80;
    server_name api.webname.uz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Перезагрузите Nginx
nginx -t
systemctl reload nginx
```

## 📋 Шаг 6: Обновление Flutter приложения

Создайте новый сервис для работы с VPS API (см. следующий файл).

## ✅ Готово!

После выполнения всех шагов:
- ✅ PostgreSQL работает на VPS
- ✅ API сервер доступен
- ✅ Можно начинать миграцию данных

## 🔄 Следующие шаги

1. Обновить Flutter приложение
2. Мигрировать чувствительные данные
3. Протестировать работу

