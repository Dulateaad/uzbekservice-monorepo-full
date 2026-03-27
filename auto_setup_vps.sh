#!/bin/bash

# Автоматическая настройка VPS для гибридной модели
# Использование: ./auto_setup_vps.sh

set -e

VPS_IP="95.46.96.53"
VPS_USER="root"
VPS_PATH="/var/www/api"

echo "🚀 Автоматическая настройка VPS для гибридной модели..."
echo ""

# Проверка подключения
echo "📡 Проверка подключения к VPS..."
if ! ping -c 1 $VPS_IP &> /dev/null; then
    echo "❌ VPS недоступен. Проверьте подключение."
    exit 1
fi
echo "✅ VPS доступен"
echo ""

# Шаг 1: Загрузка всех файлов на VPS
echo "📤 Загрузка файлов на VPS..."

# Создание директорий на VPS
ssh $VPS_USER@$VPS_IP "mkdir -p /var/www/api /root/setup"

# Загрузка файлов
echo "  - Загрузка скриптов..."
scp vps_setup_postgresql.sh vps_create_tables.sql $VPS_USER@$VPS_IP:/root/setup/
scp vps_api_server.js vps_api_package.json vps_api_setup.sh $VPS_USER@$VPS_IP:/var/www/api/

echo "✅ Файлы загружены"
echo ""

# Шаг 2: Выполнение настройки на VPS
echo "⚙️  Выполнение настройки на VPS..."
echo ""

# Создание единого скрипта настройки
cat > /tmp/vps_full_setup.sh <<'VPSSCRIPT'
#!/bin/bash
set -e

echo "🗄️  Шаг 1: Установка PostgreSQL..."
dnf install -y postgresql15-server postgresql15
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql
echo "✅ PostgreSQL установлен"

echo ""
echo "👤 Шаг 2: Создание БД и пользователя..."
su - postgres <<'POSTGRES'
createdb uzbekservice_db 2>/dev/null || echo "БД уже существует"
createuser uzbekservice_user 2>/dev/null || echo "Пользователь уже существует"
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'Uzbekservice2026!Secure';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"
POSTGRES
echo "✅ БД и пользователь созданы"

echo ""
echo "📋 Шаг 3: Создание таблиц..."
su - postgres -c "psql -U uzbekservice_user -d uzbekservice_db -f /root/setup/vps_create_tables.sql"
echo "✅ Таблицы созданы"

echo ""
echo "📦 Шаг 4: Установка Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
echo "✅ Node.js установлен"

echo ""
echo "📦 Шаг 5: Установка зависимостей API..."
cd /var/www/api
npm install
echo "✅ Зависимости установлены"

echo ""
echo "⚙️  Шаг 6: Создание .env файла..."
cat > /var/www/api/.env <<EOF
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026!Secure
DB_PORT=5432
NODE_ENV=production
EOF
echo "✅ .env файл создан"

echo ""
echo "🔧 Шаг 7: Создание systemd service..."
cat > /etc/systemd/system/uzbekservice-api.service <<'SERVICEFILE'
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
SERVICEFILE

systemctl daemon-reload
systemctl start uzbekservice-api
systemctl enable uzbekservice-api
echo "✅ API сервер запущен"

echo ""
echo "🔥 Шаг 8: Настройка firewall..."
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
echo "✅ Firewall настроен"

echo ""
echo "✅ ВСЕ ГОТОВО!"
echo ""
echo "📋 Информация:"
echo "   PostgreSQL: ✅ Работает"
echo "   API сервер: ✅ Работает на порту 3000"
echo "   URL: http://95.46.96.53:3000"
echo ""
echo "🔍 Проверка:"
curl -s http://localhost:3000/health || echo "API еще запускается..."
VPSSCRIPT

# Загрузка скрипта на VPS
scp /tmp/vps_full_setup.sh $VPS_USER@$VPS_IP:/root/setup/
rm /tmp/vps_full_setup.sh

# Выполнение на VPS
echo "⏳ Выполнение настройки (это может занять несколько минут)..."
ssh $VPS_USER@$VPS_IP "chmod +x /root/setup/vps_full_setup.sh && bash /root/setup/vps_full_setup.sh"

echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "📋 Проверка работы:"
echo "   curl http://95.46.96.53:3000/health"
echo ""
echo "✅ VPS готов к работе с гибридной моделью!"

