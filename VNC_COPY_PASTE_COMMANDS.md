# Команды для копирования-вставки в VNC терминал

## 🎯 Просто скопируйте и вставьте команды в VNC терминал

### Блок 1: Установка PostgreSQL (скопируйте весь блок)

```bash
dnf install -y postgresql15-server postgresql15 && postgresql-setup --initdb && systemctl start postgresql && systemctl enable postgresql && systemctl status postgresql --no-pager
```

### Блок 2: Создание БД и пользователя (скопируйте весь блок)

**Вариант A: Выполните по отдельности (рекомендуется):**

```bash
su - postgres
createdb uzbekservice_db
createuser uzbekservice_user
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'Uzbekservice2026Secure';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"
exit
```

**Вариант B: Одной командой:**

```bash
set +H && su - postgres -c "createdb uzbekservice_db 2>/dev/null || echo 'БД существует'; createuser uzbekservice_user 2>/dev/null || echo 'Пользователь существует'; psql -c 'ALTER USER uzbekservice_user WITH PASSWORD '\''Uzbekservice2026Secure'\'';'; psql -c 'GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;';"
```

### Блок 3: Установка Node.js (скопируйте весь блок)

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - && dnf install -y nodejs && node --version && npm --version
```

### Блок 4: Создание директорий (скопируйте весь блок)

```bash
mkdir -p /var/www/api /root/setup && echo "✅ Директории созданы"
```

---

## 📤 Теперь загрузите файлы с локального компьютера

**Откройте НОВЫЙ терминал на вашем Mac** и выполните:

```bash
cd /Users/dulatea/uzbekservice_app

# Загрузка файлов
scp vps_create_tables.sql root@95.46.96.53:/root/setup/
scp vps_api_server.js vps_api_package.json root@95.46.96.53:/var/www/api/
```

**Введите пароль VPS** когда запросит.

---

## 🔄 Вернитесь в VNC терминал и выполните:

### Блок 5: Создание таблиц (скопируйте весь блок)

```bash
su - postgres -c "psql -U uzbekservice_user -d uzbekservice_db -f /root/setup/vps_create_tables.sql"
```

### Блок 6: Установка зависимостей API (скопируйте весь блок)

```bash
cd /var/www/api && npm install && echo "✅ Зависимости установлены"
```

### Блок 7: Создание .env файла (скопируйте весь блок)

```bash
cat > /var/www/api/.env <<'EOF'
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026Secure
DB_PORT=5432
NODE_ENV=production
EOF
echo "✅ .env файл создан"
```

### Блок 8: Создание systemd service (скопируйте весь блок)

```bash
cat > /etc/systemd/system/uzbekservice-api.service <<'EOF'
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
EOF
systemctl daemon-reload && systemctl start uzbekservice-api && systemctl enable uzbekservice-api && systemctl status uzbekservice-api --no-pager
```

### Блок 9: Настройка firewall (скопируйте весь блок)

```bash
firewall-cmd --permanent --add-port=3000/tcp && firewall-cmd --reload && echo "✅ Firewall настроен"
```

### Блок 10: Проверка работы (скопируйте весь блок)

```bash
sleep 3 && curl http://localhost:3000/health && echo "" && echo "✅ API работает!"
```

---

## ✅ Готово!

Если все блоки выполнены успешно, API должен работать на `http://95.46.96.53:3000`

## 🔍 Проверка

```bash
# Проверка API
curl http://95.46.96.53:3000/health

# Проверка данных в БД
su - postgres -c "psql -U uzbekservice_user -d uzbekservice_db -c 'SELECT COUNT(*) FROM users_sensitive;'"
```

