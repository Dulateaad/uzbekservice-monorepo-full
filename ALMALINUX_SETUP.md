# Настройка AlmaLinux 8.9 для webname.uz

## Важно: Это AlmaLinux, не Ubuntu!

AlmaLinux использует `dnf` вместо `apt`, и некоторые команды отличаются.

## После входа в систему

### 1. Обновление системы

```bash
# Обновление пакетов
dnf update -y

# Установка базовых утилит
dnf install -y wget curl nano
```

### 2. Установка Nginx

```bash
# Установка Nginx
dnf install -y nginx

# Запуск и автозапуск
systemctl start nginx
systemctl enable nginx

# Проверка статуса
systemctl status nginx
```

### 3. Установка Certbot для SSL

```bash
# Установка EPEL репозитория (нужен для Certbot)
dnf install -y epel-release

# Установка Certbot
dnf install -y certbot python3-certbot-nginx

# Проверка установки
certbot --version
```

### 4. Настройка Firewall

```bash
# Проверка статуса firewall
systemctl status firewalld

# Если не запущен, запустите:
systemctl start firewalld
systemctl enable firewalld

# Разрешите необходимые порты
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload

# Проверка правил
firewall-cmd --list-all
```

### 5. Создание директории для сайта

```bash
# Создание директории
mkdir -p /var/www/webname.uz

# Установка прав (для AlmaLinux пользователь nginx, не www-data)
chown -R nginx:nginx /var/www/webname.uz
chmod -R 755 /var/www/webname.uz
```

### 6. Настройка Nginx

```bash
# Создание конфигурации
nano /etc/nginx/conf.d/webname.uz.conf
```

Вставьте конфигурацию (см. `vps_nginx_config.conf`, но замените `www-data` на `nginx`):

```nginx
# HTTP -> HTTPS редирект
server {
    listen 80;
    listen [::]:80;
    server_name webname.uz www.webname.uz;
    return 301 https://$server_name$request_uri;
}

# HTTPS конфигурация
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name webname.uz www.webname.uz;

    # SSL сертификаты (будут настроены Certbot)
    ssl_certificate /etc/letsencrypt/live/webname.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/webname.uz/privkey.pem;
    
    root /var/www/webname.uz;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Проверьте и перезагрузите:
```bash
nginx -t
systemctl reload nginx
```

### 7. Получение SSL сертификата

```bash
certbot --nginx -d webname.uz -d www.webname.uz
```

### 8. Загрузка приложения

**С локального компьютера:**
```bash
cd /Users/dulatea/uzbekservice_app
flutter build web --release
scp -r build/web/* root@95.46.96.53:/var/www/webname.uz/
```

**Или используйте скрипт:**
```bash
./deploy_to_vps.sh
```

## Отличия от Ubuntu/Debian

| Ubuntu/Debian | AlmaLinux |
|--------------|-----------|
| `apt update` | `dnf update` |
| `apt install` | `dnf install` |
| `www-data` | `nginx` |
| `ufw` | `firewalld` |

## Полезные команды

```bash
# Проверка версии
cat /etc/os-release

# Просмотр логов Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Перезапуск Nginx
systemctl restart nginx

# Проверка статуса сервисов
systemctl status nginx
systemctl status firewalld
```

