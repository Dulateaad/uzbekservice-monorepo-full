#!/bin/bash

# Скрипт для настройки API сервера на VPS
# Выполните на VPS: bash vps_api_setup.sh

set -e

echo "🚀 Настройка API сервера на VPS..."

# 1. Создание директории
echo "📁 Создание директории..."
mkdir -p /var/www/api
cd /var/www/api

# 2. Копирование файлов (предполагается, что они уже загружены)
# Если файлы на локальном компьютере, загрузите их:
# scp vps_api_server.js vps_api_package.json root@95.46.96.53:/var/www/api/

echo "📦 Установка Node.js зависимостей..."
if [ ! -f "package.json" ]; then
    echo "⚠️  package.json не найден. Создайте его или загрузите файлы."
    exit 1
fi

npm install

# 3. Создание .env файла
echo "⚙️  Создание .env файла..."
cat > .env <<EOF
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026Secure
DB_PORT=5432
NODE_ENV=production
EOF

echo "⚠️  ВАЖНО: Измените пароль БД в .env файле!"

# 4. Создание systemd service
echo "🔧 Создание systemd service..."
cat > /etc/systemd/system/uzbekservice-api.service <<EOF
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

# 5. Запуск сервиса
echo "🚀 Запуск API сервера..."
systemctl daemon-reload
systemctl start uzbekservice-api
systemctl enable uzbekservice-api

# 6. Настройка firewall
echo "🔥 Настройка firewall..."
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

# 7. Проверка статуса
echo "✅ Проверка статуса..."
systemctl status uzbekservice-api --no-pager

echo ""
echo "✅ API сервер настроен и запущен!"
echo ""
echo "📋 Информация:"
echo "   Порт: 3000"
echo "   URL: http://95.46.96.53:3000"
echo "   Health check: http://95.46.96.53:3000/health"
echo ""
echo "📋 Полезные команды:"
echo "   Статус: systemctl status uzbekservice-api"
echo "   Логи: journalctl -u uzbekservice-api -f"
echo "   Перезапуск: systemctl restart uzbekservice-api"

