#!/bin/bash

# Скрипт для автоматического деплоя на VPS
# Использование: ./deploy_to_vps.sh

set -e  # Остановка при ошибке

# Конфигурация
VPS_HOST="95.46.96.53"  # IP адрес VPS
VPS_USER="root"
VPS_PATH="/var/www/webname.uz"
LOCAL_BUILD_DIR="build/web"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Начинаем деплой на VPS...${NC}"

# Шаг 1: Сборка Flutter приложения
echo -e "${YELLOW}📦 Собираем Flutter приложение...${NC}"
flutter build web --release

if [ ! -d "$LOCAL_BUILD_DIR" ]; then
    echo -e "${RED}❌ Ошибка: Директория $LOCAL_BUILD_DIR не найдена${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Сборка завершена${NC}"

# Шаг 2: Создание бэкапа на VPS
echo -e "${YELLOW}💾 Создаем бэкап на VPS...${NC}"
ssh $VPS_USER@$VPS_HOST "mkdir -p /root/backups && tar -czf /root/backups/webname_uz_backup_\$(date +%Y%m%d_%H%M%S).tar.gz $VPS_PATH 2>/dev/null || true"
echo -e "${GREEN}✅ Бэкап создан${NC}"

# Шаг 3: Загрузка файлов на VPS
echo -e "${YELLOW}📤 Загружаем файлы на VPS...${NC}"
rsync -avz --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    $LOCAL_BUILD_DIR/ $VPS_USER@$VPS_HOST:$VPS_PATH/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Файлы загружены${NC}"
else
    echo -e "${RED}❌ Ошибка при загрузке файлов${NC}"
    exit 1
fi

# Шаг 4: Установка правильных прав доступа
echo -e "${YELLOW}🔐 Устанавливаем права доступа...${NC}"
ssh $VPS_USER@$VPS_HOST "chown -R www-data:www-data $VPS_PATH && chmod -R 755 $VPS_PATH"
echo -e "${GREEN}✅ Права установлены${NC}"

# Шаг 5: Перезагрузка Nginx
echo -e "${YELLOW}🔄 Перезагружаем Nginx...${NC}"
ssh $VPS_USER@$VPS_HOST "nginx -t && systemctl reload nginx"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx перезагружен${NC}"
else
    echo -e "${RED}❌ Ошибка при перезагрузке Nginx${NC}"
    exit 1
fi

# Шаг 6: Проверка доступности
echo -e "${YELLOW}🔍 Проверяем доступность сайта...${NC}"
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://webname.uz || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅ Сайт доступен (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠️  Сайт вернул код $HTTP_CODE (возможно, еще обновляется)${NC}"
fi

echo -e "${GREEN}🎉 Деплой завершен!${NC}"
echo -e "${GREEN}🌐 Сайт: https://webname.uz${NC}"

