# Настройка продакшена на VPS

## 📋 Что нужно сделать:

1. ✅ Резервное копирование БД
2. ✅ Аутентификация API
3. ✅ HTTPS (SSL/TLS)

---

## 1. Резервное копирование БД

### Шаг 1: Создание скрипта бэкапа

Выполните в VNC терминале:

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

### Шаг 2: Тестирование бэкапа

```bash
/root/backup_db.sh
```

### Шаг 3: Настройка автоматического бэкапа (каждый день в 2:00)

```bash
echo "0 2 * * * /root/backup_db.sh >> /var/log/backup_db.log 2>&1" | crontab -
```

### Шаг 4: Проверка cron

```bash
crontab -l
```

---

## 2. Аутентификация API

### Шаг 1: Генерация API ключа

```bash
# Генерируем случайный ключ
API_KEY=$(openssl rand -hex 32)
echo "Ваш API ключ: $API_KEY"
echo "Сохраните его в безопасном месте!"
```

### Шаг 2: Обновление .env файла

```bash
# Добавляем API ключ в .env
echo "API_KEY=$API_KEY" >> /var/www/api/.env

# Проверяем
cat /var/www/api/.env
```

### Шаг 3: Замена API сервера на защищенную версию

```bash
cd /var/www/api

# Создаем резервную копию старого сервера
cp vps_api_server.js vps_api_server.js.backup

# Создаем новый защищенный сервер
cat > vps_api_server_secure.js <<'JSEOF'
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('❌ ОШИБКА: API_KEY не установлен в .env файле!');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

const apiKeyMiddleware = (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'API ключ не предоставлен. Используйте заголовок X-API-Key.'
    });
  }
  
  if (apiKey !== API_KEY) {
    console.warn(`⚠️  Неверный API ключ с IP: ${req.ip}`);
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Неверный API ключ.'
    });
  }
  
  next();
};

app.use('/api', apiKeyMiddleware);

const pool = new Pool({
  user: process.env.DB_USER || 'uzbekservice_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'uzbekservice_db',
  password: process.env.DB_PASSWORD || 'Uzbekservice2026Secure',
  port: process.env.DB_PORT || 5432,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err);
  } else {
    console.log('✅ Подключено к PostgreSQL:', res.rows[0].now);
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    api_secured: true
  });
});

// ... (остальные роуты из vps_api_server.js)
JSEOF

# Копируем остальные роуты из старого файла
# (Или используйте готовый файл vps_api_server_secure.js)
```

### Шаг 4: Обновление systemd service

```bash
# Обновляем service для использования нового файла
sed -i 's/vps_api_server.js/vps_api_server_secure.js/g' /etc/systemd/system/uzbekservice-api.service

# Перезагружаем конфигурацию
systemctl daemon-reload

# Перезапускаем сервис
systemctl restart uzbekservice-api

# Проверяем статус
systemctl status uzbekservice-api --no-pager
```

### Шаг 5: Тестирование

```bash
# Без ключа (должна быть ошибка)
curl http://localhost:3000/api/stats

# С ключом (должен работать)
curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/stats
```

---

## 3. HTTPS (SSL/TLS)

### Шаг 1: Установка Nginx и Certbot

```bash
dnf install -y nginx certbot python3-certbot-nginx
systemctl start nginx
systemctl enable nginx
```

### Шаг 2: Настройка DNS

Убедитесь, что домен `api.webname.uz` (или ваш домен) указывает на IP `95.46.96.53`:

```bash
# Проверка DNS
nslookup api.webname.uz
```

### Шаг 3: Создание конфигурации Nginx

```bash
cat > /etc/nginx/conf.d/uzbekservice-api.conf <<'NGINXEOF'
server {
    listen 80;
    server_name api.webname.uz;  # Замените на ваш домен
    
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

# Проверка конфигурации
nginx -t

# Перезагрузка Nginx
systemctl reload nginx
```

### Шаг 4: Получение SSL сертификата

```bash
# Замените api.webname.uz на ваш домен
certbot --nginx -d api.webname.uz

# Следуйте инструкциям:
# - Введите email
# - Согласитесь с условиями
# - Certbot автоматически настроит HTTPS
```

### Шаг 5: Автоматическое обновление сертификата

```bash
# Certbot автоматически добавляет задачу в cron
# Проверка:
certbot renew --dry-run
```

### Шаг 6: Обновление firewall

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

---

## 4. Обновление Flutter приложения

После настройки API ключа и HTTPS, обновите `lib/services/vps_api_service.dart`:

1. Измените URL на HTTPS
2. Добавьте отправку API ключа в заголовках

---

## ✅ Проверка

После всех настроек проверьте:

```bash
# 1. Бэкап работает
/root/backup_db.sh

# 2. API требует ключ
curl http://localhost:3000/api/stats

# 3. HTTPS работает
curl https://api.webname.uz/health
```

---

## 📋 Итоговый чеклист

- [ ] Резервное копирование настроено и протестировано
- [ ] API ключ сгенерирован и добавлен в .env
- [ ] Защищенный API сервер запущен
- [ ] Flutter приложение обновлено с API ключом
- [ ] Nginx установлен и настроен
- [ ] SSL сертификат получен
- [ ] HTTPS работает
- [ ] Firewall настроен

---

## 🎉 Готово!

Теперь ваш API защищен и готов к продакшену!

