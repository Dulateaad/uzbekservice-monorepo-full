# Исправленные команды для VNC терминала

## ⚠️ Важно: Копируйте ТОЛЬКО команды, без символов ```bash и ```

---

## Блок 1: Установка PostgreSQL

**Шаг 1.1: Добавление официального репозитория PostgreSQL**

Скопируйте и вставьте:

```bash
dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
```

**Шаг 1.2: Установка PostgreSQL 15**

Скопируйте и вставьте:

```bash
dnf install -y postgresql15-server postgresql15
```

**Шаг 1.3: Инициализация и запуск**

Скопируйте и вставьте:

```bash
postgresql-setup --initdb && systemctl start postgresql && systemctl enable postgresql && systemctl status postgresql --no-pager
```

**Если PostgreSQL 15 не устанавливается, попробуйте стандартную версию:**

```bash
dnf install -y postgresql-server postgresql && postgresql-setup --initdb && systemctl start postgresql && systemctl enable postgresql
```

---

## Блок 2: Создание БД и пользователя (ИСПРАВЛЕНО)

Скопируйте и вставьте (без кавычек вокруг всего):

```bash
set +H
su - postgres -c "createdb uzbekservice_db 2>/dev/null || echo 'БД существует'; createuser uzbekservice_user 2>/dev/null || echo 'Пользователь существует'; psql -c 'ALTER USER uzbekservice_user WITH PASSWORD '\''Uzbekservice2026Secure'\'';'; psql -c 'GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;';"
```

**Или проще - выполните по отдельности:**

```bash
su - postgres
createdb uzbekservice_db
createuser uzbekservice_user
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'Uzbekservice2026Secure';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"
exit
```

---

## Блок 3: Установка Node.js

Скопируйте и вставьте:

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - && dnf install -y nodejs && node --version && npm --version
```

---

## Блок 4: Создание директорий

Скопируйте и вставьте:

```bash
mkdir -p /var/www/api /root/setup && echo "Директории созданы"
```

---

## Блок 5: Загрузка файлов (выполните на Mac в терминале)

Откройте НОВЫЙ терминал на Mac и выполните:

```bash
cd /Users/dulatea/uzbekservice_app
scp vps_create_tables.sql root@95.46.96.53:/root/setup/
scp vps_api_server.js vps_api_package.json root@95.46.96.53:/var/www/api/
```

Введите пароль VPS когда запросит.

---

## Блок 6: Создание таблиц

Вернитесь в VNC терминал и выполните:

```bash
su - postgres -c "psql -U uzbekservice_user -d uzbekservice_db -f /root/setup/vps_create_tables.sql"
```

---

## Блок 7: Установка зависимостей API

Скопируйте и вставьте:

```bash
cd /var/www/api && npm install && echo "Зависимости установлены"
```

---

## Блок 8: Создание .env файла

Скопируйте и вставьте:

```bash
cat > /var/www/api/.env <<'ENVEOF'
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026Secure
DB_PORT=5432
NODE_ENV=production
ENVEOF
echo "Файл .env создан"
```

---

## Блок 9: Создание systemd service

Скопируйте и вставьте:

```bash
cat > /etc/systemd/system/uzbekservice-api.service <<'SERVICEEOF'
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
SERVICEEOF
systemctl daemon-reload
systemctl start uzbekservice-api
systemctl enable uzbekservice-api
systemctl status uzbekservice-api --no-pager
```

---

## Блок 10: Настройка firewall

Скопируйте и вставьте:

```bash
firewall-cmd --permanent --add-port=3000/tcp && firewall-cmd --reload && echo "Firewall настроен"
```

---

## Блок 11: Проверка работы

Скопируйте и вставьте:

```bash
sleep 3 && curl http://localhost:3000/health && echo "" && echo "API работает!"
```

---

## ✅ Готово!

Если все блоки выполнены успешно, API должен работать.

## 🔍 Дополнительная проверка

```bash
# Проверка статуса
systemctl status uzbekservice-api

# Проверка логов
journalctl -u uzbekservice-api -n 20

# Проверка БД
su - postgres -c "psql -U uzbekservice_user -d uzbekservice_db -c 'SELECT COUNT(*) FROM users_sensitive;'"
```

