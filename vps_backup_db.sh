#!/bin/bash

# Скрипт резервного копирования PostgreSQL БД
# Автоматически создает бэкап и удаляет старые (старше 7 дней)

BACKUP_DIR="/root/backups/uzbekservice"
DB_NAME="uzbekservice_db"
RETENTION_DAYS=7

# Создаем директорию для бэкапов
mkdir -p "$BACKUP_DIR"

# Генерируем имя файла с датой и временем
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/uzbekservice_db_$DATE.sql"

# Создаем бэкап
echo "📦 Создание резервной копии БД: $DB_NAME"
su - postgres -c "pg_dump -F p $DB_NAME" > "$BACKUP_FILE"

# Проверяем успешность создания
if [ $? -eq 0 ]; then
    # Сжимаем бэкап
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    # Получаем размер файла
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    echo "✅ Резервная копия создана: $BACKUP_FILE ($SIZE)"
    
    # Удаляем старые бэкапы (старше RETENTION_DAYS дней)
    echo "🗑️  Удаление старых бэкапов (старше $RETENTION_DAYS дней)..."
    find "$BACKUP_DIR" -name "uzbekservice_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Подсчитываем количество бэкапов
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
    echo "📊 Всего бэкапов: $BACKUP_COUNT"
    
    exit 0
else
    echo "❌ Ошибка создания резервной копии!"
    exit 1
fi

