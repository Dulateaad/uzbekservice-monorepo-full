#!/bin/bash

# Одна команда для настройки всего на VPS
# Скопируйте весь этот файл в VNC терминал и выполните

echo "🚀 Начинаем автоматическую настройку..."

# 1. Установка PostgreSQL
echo "📦 Установка PostgreSQL..."
dnf install -y postgresql15-server postgresql15
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql

# 2. Создание БД
echo "🗄️  Создание БД..."
su - postgres <<'EOF'
createdb uzbekservice_db 2>/dev/null || echo "БД существует"
createuser uzbekservice_user 2>/dev/null || echo "Пользователь существует"
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'Uzbekservice2026!Secure';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"
EOF

# 3. Установка Node.js
echo "📦 Установка Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# 4. Создание директорий
echo "📁 Создание директорий..."
mkdir -p /var/www/api /root/setup

# 5. Создание таблиц (нужно сначала загрузить файл)
echo "📋 Создание таблиц..."
if [ -f "/root/setup/vps_create_tables.sql" ]; then
    su - postgres -c "psql -U uzbekservice_user -d uzbekservice_db -f /root/setup/vps_create_tables.sql"
else
    echo "⚠️  Файл vps_create_tables.sql не найден. Загрузите его сначала."
fi

# 6. Установка зависимостей (нужно сначала загрузить файлы)
echo "📦 Установка зависимостей API..."
if [ -f "/var/www/api/package.json" ]; then
    cd /var/www/api
    npm install
else
    echo "⚠️  Файлы API не найдены. Загрузите их сначала."
fi

# 7. Создание .env
echo "⚙️  Создание .env..."
cat > /var/www/api/.env <<'ENVEOF'
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026!Secure
DB_PORT=5432
NODE_ENV=production
ENVEOF

# 8. Создание systemd service
echo "🔧 Создание systemd service..."
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

# 9. Firewall
echo "🔥 Настройка firewall..."
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

# 10. Проверка
echo "🔍 Проверка..."
sleep 3
systemctl status uzbekservice-api --no-pager | head -10
curl -s http://localhost:3000/health && echo "" || echo "API еще запускается..."

echo ""
echo "✅ Настройка завершена!"
echo "📡 API доступен: http://95.46.96.53:3000"

