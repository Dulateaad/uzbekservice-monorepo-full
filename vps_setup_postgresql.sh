#!/bin/bash

# Скрипт для установки PostgreSQL на VPS
# Выполните на VPS: bash vps_setup_postgresql.sh

set -e

echo "🗄️  Установка PostgreSQL на VPS..."

# 1. Установка PostgreSQL
echo "📦 Установка PostgreSQL..."
dnf install -y postgresql15-server postgresql15

# 2. Инициализация БД
echo "🔧 Инициализация базы данных..."
postgresql-setup --initdb

# 3. Запуск PostgreSQL
echo "🚀 Запуск PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# 4. Проверка статуса
echo "✅ Проверка статуса..."
systemctl status postgresql --no-pager

# 5. Создание БД и пользователя
echo "👤 Создание пользователя и базы данных..."
su - postgres <<EOF
createdb uzbekservice_db 2>/dev/null || echo "БД уже существует"
createuser uzbekservice_user 2>/dev/null || echo "Пользователь уже существует"
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'Uzbekservice2026Secure';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"
EOF

echo ""
echo "✅ PostgreSQL установлен и настроен!"
echo ""
echo "📋 Информация:"
echo "   БД: uzbekservice_db"
echo "   Пользователь: uzbekservice_user"
echo "   Пароль: Uzbekservice2026!Secure"
echo ""
echo "⚠️  ВАЖНО: Измените пароль на более надежный!"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Подключитесь к БД: psql -U uzbekservice_user -d uzbekservice_db"
echo "   2. Создайте таблицы (см. VPS_DATABASE_SETUP.md)"
echo "   3. Настройте API сервер"

