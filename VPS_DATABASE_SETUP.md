# Настройка базы данных на VPS для соответствия законодательству Узбекистана

## 🎯 Цель

Настроить PostgreSQL на VPS в Узбекистане для хранения персональных данных граждан Узбекистана в соответствии с законом ZRU-547.

## 📋 Шаг 1: Установка PostgreSQL

### На VPS (AlmaLinux) выполните:

```bash
# Установка PostgreSQL
dnf install -y postgresql15-server postgresql15

# Инициализация БД
postgresql-setup --initdb

# Запуск PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Проверка статуса
systemctl status postgresql
```

## 📋 Шаг 2: Настройка PostgreSQL

```bash
# Переключение на пользователя postgres
su - postgres

# Создание БД для приложения
createdb uzbekservice_db

# Создание пользователя
createuser uzbekservice_user

# Установка пароля
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'ВАШ_НАДЕЖНЫЙ_ПАРОЛЬ';"

# Предоставление прав
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"

# Выход
exit
```

## 📋 Шаг 3: Настройка безопасности

```bash
# Редактирование конфигурации
nano /var/lib/pgsql/15/data/postgresql.conf
```

Найдите и измените:
```
listen_addresses = 'localhost'  # Только локальные подключения
port = 5432
```

```bash
# Настройка доступа
nano /var/lib/pgsql/15/data/pg_hba.conf
```

Добавьте:
```
# Локальные подключения
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

```bash
# Перезапуск PostgreSQL
systemctl restart postgresql
```

## 📋 Шаг 4: Установка Node.js для API

```bash
# Установка Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# Проверка версии
node --version
npm --version
```

## 📋 Шаг 5: Создание API сервера

Создайте структуру:

```bash
mkdir -p /var/www/api
cd /var/www/api
npm init -y
```

Установите зависимости:

```bash
npm install express pg cors dotenv bcrypt jsonwebtoken
npm install -D nodemon
```

## 📋 Шаг 6: Настройка Firewall

```bash
# PostgreSQL не должен быть доступен извне
# Только через localhost или через API

# Если нужен доступ извне (не рекомендуется):
# firewall-cmd --permanent --add-port=5432/tcp
# firewall-cmd --reload
```

## 📋 Шаг 7: Резервное копирование

```bash
# Создание скрипта бэкапа
nano /root/backup_db.sh
```

Вставьте:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# Бэкап БД
su - postgres -c "pg_dump uzbekservice_db > $BACKUP_DIR/uzbekservice_db_$DATE.sql"

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "uzbekservice_db_*.sql" -mtime +30 -delete

echo "Backup completed: uzbekservice_db_$DATE.sql"
```

```bash
# Права на выполнение
chmod +x /root/backup_db.sh

# Добавление в cron (ежедневно в 3:00)
crontab -e
# Добавьте:
0 3 * * * /root/backup_db.sh
```

## 📋 Шаг 8: Создание таблиц

Подключитесь к БД:

```bash
su - postgres
psql uzbekservice_db
```

Создайте базовые таблицы:

```sql
-- Пользователи (чувствительные данные)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255),
    email VARCHAR(255),
    address TEXT,
    location JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_created ON users(created_at);

-- Выход
\q
exit
```

## 📋 Шаг 9: Настройка SSL для PostgreSQL

```bash
# Генерация SSL сертификатов (опционально, для дополнительной безопасности)
cd /var/lib/pgsql/15/data
openssl req -new -x509 -days 365 -nodes -text -out server.crt -keyout server.key
chmod 600 server.key
chown postgres:postgres server.key server.crt
```

## 📋 Шаг 10: Мониторинг

```bash
# Установка мониторинга (опционально)
dnf install -y htop

# Просмотр подключений к БД
su - postgres
psql uzbekservice_db -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🔒 Безопасность

### Рекомендации:

1. ✅ **Не открывайте PostgreSQL наружу** - только через API
2. ✅ **Используйте сильные пароли**
3. ✅ **Регулярные обновления**
4. ✅ **Ежедневные бэкапы**
5. ✅ **Мониторинг доступа**

## 📊 Следующие шаги

1. ✅ Создать API сервер (Node.js/Express)
2. ✅ Настроить аутентификацию
3. ✅ Обновить Flutter приложение
4. ✅ Мигрировать данные из Firebase
5. ✅ Зарегистрировать БД в Государственном регистре

## 📄 Регистрация базы данных

После настройки нужно:

1. Подготовить документы о БД
2. Подать заявление в Государственный регистр персональных баз данных
3. Получить разрешение на обработку данных

