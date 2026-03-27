# Развертывание на VPS (webname.uz)

## Информация о сервере

- **Домен:** webname.uz
- **VPS:** gaysyrdl.vps.webspace.uz
- **Характеристики:** 4x1500MHz, 8GB RAM, 30GB SSD
- **Период:** 26.01.2026 - 26.02.2026

## Шаг 1: Настройка DNS записей

### В панели управления доменом webname.uz добавьте:

#### A запись (основной домен):
```
Тип: A
Имя: @ (или пусто)
Значение: 95.46.96.53
TTL: 3600
```

#### A запись (www поддомен):
```
Тип: A
Имя: www
Значение: 95.46.96.53
TTL: 3600
```

**IP адрес VPS:** `95.46.96.53`

## Шаг 2: Подключение к VPS

```bash
# Подключитесь по SSH
ssh root@95.46.96.53
```

## Шаг 3: Установка необходимого ПО

### Обновление системы (Ubuntu/Debian):
```bash
apt update && apt upgrade -y
```

### Установка Nginx:
```bash
apt install nginx -y
systemctl start nginx
systemctl enable nginx
```

### Установка Node.js (для возможных серверных функций):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### Установка Certbot (для SSL):
```bash
apt install certbot python3-certbot-nginx -y
```

## Шаг 4: Настройка Nginx

### Создайте конфигурационный файл:
```bash
nano /etc/nginx/sites-available/webname.uz
```

### Вставьте следующую конфигурацию:
```nginx
server {
    listen 80;
    server_name webname.uz www.webname.uz;

    root /var/www/webname.uz;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker
    location /sw.js {
        add_header Cache-Control "no-cache";
        proxy_cache_bypass $http_pragma;
        proxy_cache_revalidate on;
        expires off;
        access_log off;
    }
}
```

### Активируйте конфигурацию:
```bash
ln -s /etc/nginx/sites-available/webname.uz /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Удалите дефолтную конфигурацию
nginx -t  # Проверьте конфигурацию
systemctl reload nginx
```

## Шаг 5: Создание директории для приложения

```bash
mkdir -p /var/www/webname.uz
chown -R www-data:www-data /var/www/webname.uz
chmod -R 755 /var/www/webname.uz
```

## Шаг 6: Развертывание Flutter приложения

### Вариант 1: Загрузка через SCP (с локального компьютера)

```bash
# На вашем локальном компьютере:
cd /Users/dulatea/uzbekservice_app
flutter build web --release

# Загрузите файлы на VPS:
scp -r build/web/* root@95.46.96.53:/var/www/webname.uz/
```

### Вариант 2: Через Git (рекомендуется)

```bash
# На VPS:
apt install git -y
cd /var/www
git clone https://github.com/your-repo/uzbekservice_app.git webname.uz
cd webname.uz

# Установите Flutter на VPS (если нужно):
# Или используйте предсобранные файлы
```

### Вариант 3: Автоматический деплой через скрипт

См. файл `deploy_to_vps.sh` ниже.

## Шаг 7: Настройка SSL (HTTPS)

### Получите SSL сертификат от Let's Encrypt:
```bash
certbot --nginx -d webname.uz -d www.webname.uz
```

Следуйте инструкциям:
- Введите email для уведомлений
- Согласитесь с условиями
- Certbot автоматически обновит конфигурацию Nginx

### Автоматическое обновление сертификата:
```bash
# Certbot автоматически создает cron job для обновления
# Проверьте:
certbot renew --dry-run
```

## Шаг 8: Настройка Firewall

```bash
# Установите UFW (если не установлен)
apt install ufw -y

# Разрешите необходимые порты
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# Включите firewall
ufw enable
ufw status
```

## Шаг 9: Настройка автоматического деплоя

Создайте скрипт для автоматического деплоя (см. `deploy_to_vps.sh`).

## Шаг 10: Проверка работы

1. Откройте в браузере: `http://webname.uz` (должен редиректить на HTTPS)
2. Проверьте SSL: `https://webname.uz`
3. Проверьте www: `https://www.webname.uz`

## Мониторинг и логи

### Просмотр логов Nginx:
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Проверка статуса Nginx:
```bash
systemctl status nginx
```

### Перезапуск Nginx:
```bash
systemctl restart nginx
```

## Обновление приложения

После изменений в коде:

```bash
# На локальном компьютере:
cd /Users/dulatea/uzbekservice_app
flutter build web --release

# Загрузите на VPS:
scp -r build/web/* root@95.46.96.53:/var/www/webname.uz/

# Или используйте скрипт деплоя:
./deploy_to_vps.sh
```

## Резервное копирование

### Создайте скрипт бэкапа:
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /root/backups/webname_uz_$DATE.tar.gz /var/www/webname.uz
```

### Настройте cron для автоматических бэкапов:
```bash
# Редактируйте crontab:
crontab -e

# Добавьте (ежедневно в 3:00):
0 3 * * * /root/backup.sh
```

## Проблемы и решения

### Проблема: Домен не открывается
- Проверьте DNS записи (может занять до 24 часов)
- Проверьте firewall на VPS
- Проверьте, что Nginx запущен: `systemctl status nginx`

### Проблема: SSL не работает
- Убедитесь, что порты 80 и 443 открыты
- Проверьте конфигурацию Nginx: `nginx -t`
- Проверьте логи: `tail -f /var/log/nginx/error.log`

### Проблема: 502 Bad Gateway
- Проверьте права доступа к файлам: `ls -la /var/www/webname.uz`
- Проверьте логи Nginx
- Убедитесь, что файлы загружены правильно

## Контакты поддержки

- **VPS провайдер:** webspace.uz
- **Документация:** https://webspace.uz/docs

