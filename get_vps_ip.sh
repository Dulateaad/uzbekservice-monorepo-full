#!/bin/bash

# Скрипт для проверки подключения к VPS и получения IP адреса
# Использование: ./get_vps_ip.sh [IP_АДРЕС_ИЛИ_ХОСТ]

VPS_HOST="${1:-gaysyrdl.vps.webspace.uz}"

echo "🔍 Проверка подключения к VPS..."
echo "Хост: $VPS_HOST"
echo ""

# Проверка ping
echo "📡 Проверка доступности (ping)..."
if ping -c 2 "$VPS_HOST" &> /dev/null; then
    echo "✅ Хост доступен"
else
    echo "❌ Хост недоступен через ping"
    echo ""
    echo "💡 Решения:"
    echo "1. Используйте IP адрес вместо доменного имени"
    echo "2. Получите IP адрес в панели управления webspace.uz"
    echo "3. Проверьте, что VPS запущен"
    exit 1
fi

echo ""
echo "🔐 Попытка SSH подключения..."
echo "Команда: ssh root@$VPS_HOST"
echo ""

# Попытка подключения
if ssh -o ConnectTimeout=5 -o BatchMode=yes root@"$VPS_HOST" "hostname -I 2>/dev/null || ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print \$2}' | cut -d/ -f1 | head -1" 2>/dev/null; then
    echo ""
    echo "✅ Подключение успешно!"
    echo ""
    echo "📋 IP адреса VPS:"
    ssh root@"$VPS_HOST" "echo 'IPv4:'; ip -4 addr show | grep inet | grep -v '127.0.0.1' | awk '{print \$2}' | cut -d/ -f1"
else
    echo "❌ Не удалось подключиться"
    echo ""
    echo "💡 Попробуйте:"
    echo "1. Подключиться вручную: ssh root@$VPS_HOST"
    echo "2. Или используйте IP адрес: ssh root@IP_АДРЕС"
    echo "3. Проверьте пароль и доступность VPS"
fi

