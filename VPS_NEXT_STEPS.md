# Следующие шаги после входа в VPS

## ✅ Вы успешно вошли!

Вы видите:
```
[root@gaysyrdl ~]#
```

Это означает, что вы готовы к настройке VPS.

## ⚠️ Важное замечание

Видно предупреждение о множественных неудачных попытках входа. Это нормально - боты пытаются взломать VPS. После настройки мы установим защиту.

## 📋 Шаг 1: Обновление системы

Выполните в терминале VNC:

```bash
dnf update -y
```

Это может занять несколько минут.

## 📋 Шаг 2: Установка необходимого ПО

```bash
# Установка базовых утилит
dnf install -y wget curl nano

# Установка Nginx
dnf install -y nginx

# Установка EPEL репозитория (нужен для Certbot)
dnf install -y epel-release

# Установка Certbot для SSL
dnf install -y certbot python3-certbot-nginx
```

## 📋 Шаг 3: Запуск и настройка Nginx

```bash
# Запуск Nginx
systemctl start nginx

# Автозапуск при загрузке
systemctl enable nginx

# Проверка статуса
systemctl status nginx
```

Если все хорошо, вы увидите "active (running)".

## 📋 Шаг 4: Настройка Firewall

```bash
# Запуск firewall
systemctl start firewalld
systemctl enable firewalld

# Разрешение портов
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload

# Проверка
firewall-cmd --list-all
```

## 📋 Шаг 5: Создание директории для сайта

```bash
# Создание директории
mkdir -p /var/www/webname.uz

# Установка прав (для AlmaLinux пользователь nginx)
chown -R nginx:nginx /var/www/webname.uz
chmod -R 755 /var/www/webname.uz
```

## 📋 Шаг 6: Настройка Nginx

Создайте конфигурационный файл:

```bash
nano /etc/nginx/conf.d/webname.uz.conf
```

Вставьте следующую конфигурацию:

```nginx
# HTTP -> HTTPS редирект
server {
    listen 80;
    listen [::]:80;
    server_name webname.uz www.webname.uz;
    return 301 https://$server_name$request_uri;
}

# HTTPS конфигурация (SSL будет настроен позже)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name webname.uz www.webname.uz;

    root /var/www/webname.uz;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

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
        expires off;
    }
}
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

Проверьте и перезагрузите:

```bash
# Проверка конфигурации
nginx -t

# Если OK, перезагрузите
systemctl reload nginx
```

## 📋 Шаг 7: Настройка DNS (важно!)

**Перед получением SSL сертификата** настройте DNS записи:

В панели управления доменом **webname.uz** добавьте:

### A запись:
```
Тип: A
Имя: @
Значение: 95.46.96.53
TTL: 3600
```

### A запись для www:
```
Тип: A
Имя: www
Значение: 95.46.96.53
TTL: 3600
```

**Подождите 5-10 минут** после настройки DNS.

## 📋 Шаг 8: Получение SSL сертификата

После настройки DNS выполните:

```bash
certbot --nginx -d webname.uz -d www.webname.uz
```

Следуйте инструкциям:
- Введите email
- Согласитесь с условиями
- Certbot автоматически настроит SSL

## 📋 Шаг 9: Загрузка приложения

**С локального компьютера** (в новом терминале):

```bash
cd /Users/dulatea/uzbekservice_app

# Соберите приложение
flutter build web --release

# Загрузите на VPS
scp -r build/web/* root@95.46.96.53:/var/www/webname.uz/
```

Или используйте автоматический скрипт:

```bash
./deploy_to_vps.sh
```

## 📋 Шаг 10: Проверка

Откройте в браузере:
- **https://webname.uz**
- **https://www.webname.uz**

## 🔒 Дополнительная безопасность (рекомендуется)

После настройки сайта:

```bash
# Установка fail2ban для защиты от брутфорса
dnf install -y fail2ban

# Настройка fail2ban
systemctl start fail2ban
systemctl enable fail2ban
```

## 📚 Полезные команды

```bash
# Просмотр логов Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Перезапуск Nginx
systemctl restart nginx

# Проверка статуса сервисов
systemctl status nginx
systemctl status firewalld
```

## ✅ Готово!

После выполнения всех шагов ваш сайт будет доступен по адресу **https://webname.uz**

