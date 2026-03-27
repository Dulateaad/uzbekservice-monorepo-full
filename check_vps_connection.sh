#!/bin/bash

# Скрипт для проверки подключения к VPS
# Использование: ./check_vps_connection.sh

VPS_IP="95.46.96.53"

echo "🔍 Проверка подключения к VPS ($VPS_IP)"
echo ""

# Проверка ping
echo "📡 Проверка ping..."
if ping -c 2 "$VPS_IP" &> /dev/null; then
    echo "✅ VPS доступен (ping работает)"
else
    echo "❌ VPS недоступен (ping не работает)"
    exit 1
fi

echo ""

# Проверка порта 22 (SSH)
echo "🔐 Проверка порта 22 (SSH)..."
if command -v nc &> /dev/null; then
    if nc -zv -w 3 "$VPS_IP" 22 &> /dev/null; then
        echo "✅ Порт 22 открыт"
    else
        echo "❌ Порт 22 закрыт или недоступен"
        echo "💡 Возможные причины:"
        echo "   - SSH сервис не запущен на VPS"
        echo "   - Firewall блокирует порт 22"
        echo "   - SSH настроен на другой порт"
    fi
else
    echo "⚠️  nc (netcat) не установлен, пропускаем проверку порта"
fi

echo ""

# Проверка других портов
echo "🔍 Проверка альтернативных SSH портов..."
for port in 2222 22022 2200; do
    if command -v nc &> /dev/null; then
        if nc -zv -w 2 "$VPS_IP" "$port" &> /dev/null; then
            echo "✅ Порт $port открыт (возможно, SSH на этом порту)"
        fi
    fi
done

echo ""
echo "📋 Рекомендации:"
echo "1. Используйте Web SSH в панели управления webspace.uz"
echo "2. Проверьте настройки firewall на VPS"
echo "3. Убедитесь, что SSH сервис запущен"
echo "4. Попробуйте подключиться с подробным выводом:"
echo "   ssh -vvv root@$VPS_IP"

