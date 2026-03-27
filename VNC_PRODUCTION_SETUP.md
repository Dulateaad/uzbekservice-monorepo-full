# Настройка продакшена - Команды для VNC

## 1. Резервное копирование БД

### Создание скрипта бэкапа

```bash
cat > /root/backup_db.sh <<'BACKUPEOF'
#!/bin/bash
BACKUP_DIR="/root/backups/uzbekservice"
DB_NAME="uzbekservice_db"
RETENTION_DAYS=7
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/uzbekservice_db_$DATE.sql"
echo "📦 Создание резервной копии БД: $DB_NAME"
su - postgres -c "pg_dump -F p $DB_NAME" > "$BACKUP_FILE"
if [ $? -eq 0 ]; then
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Резервная копия создана: $BACKUP_FILE ($SIZE)"
    find "$BACKUP_DIR" -name "uzbekservice_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
    echo "📊 Всего бэкапов: $BACKUP_COUNT"
    exit 0
else
    echo "❌ Ошибка создания резервной копии!"
    exit 1
fi
BACKUPEOF
chmod +x /root/backup_db.sh
```

### Тестирование

```bash
/root/backup_db.sh
```

### Настройка автоматического бэкапа (каждый день в 2:00)

```bash
echo "0 2 * * * /root/backup_db.sh >> /var/log/backup_db.log 2>&1" | crontab -
crontab -l
```

---

## 2. Аутентификация API

### Генерация API ключа

```bash
API_KEY=$(openssl rand -hex 32)
echo "Ваш API ключ: $API_KEY"
echo "Сохраните его в безопасном месте!"
```

### Добавление в .env

```bash
echo "API_KEY=$API_KEY" >> /var/www/api/.env
cat /var/www/api/.env
```

### Замена API сервера

```bash
cd /var/www/api
cp vps_api_server.js vps_api_server.js.backup
```

Затем скопируйте содержимое файла `vps_api_server_secure.js` в `vps_api_server.js` или переименуйте:

```bash
# Если у вас есть файл vps_api_server_secure.js
cp vps_api_server_secure.js vps_api_server.js
```

### Обновление systemd service

```bash
systemctl daemon-reload
systemctl restart uzbekservice-api
systemctl status uzbekservice-api --no-pager
```

### Тестирование

```bash
# Без ключа (должна быть ошибка 401)
curl http://localhost:3000/api/stats

# С ключом (должен работать)
curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/stats
```

---

## 3. HTTPS (SSL/TLS)

### Установка Nginx и Certbot

```bash
dnf install -y nginx certbot python3-certbot-nginx
systemctl start nginx
systemctl enable nginx
```

### Создание конфигурации Nginx

```bash
cat > /etc/nginx/conf.d/uzbekservice-api.conf <<'NGINXEOF'
server {
    listen 80;
    server_name api.webname.uz;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

nginx -t
systemctl reload nginx
```

### Получение SSL сертификата

```bash
certbot --nginx -d api.webname.uz
```

### Настройка firewall

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

---

## ✅ Проверка

```bash
# 1. Бэкап
/root/backup_db.sh

# 2. API с ключом
curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/stats

# 3. HTTPS
curl https://api.webname.uz/health
```

---

## 📝 Важно!

После настройки API ключа, обновите `lib/services/vps_api_service.dart` в Flutter приложении:
1. Замените `YOUR_API_KEY_HERE` на реальный ключ
2. Измените URL на HTTPS (если настроили)

