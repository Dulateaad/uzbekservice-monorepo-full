# Быстрая настройка VPS для webname.uz

## Быстрый старт (5 минут)

### 1. Подключитесь к VPS
```bash
ssh root@95.46.96.53
```

### 2. Выполните команды установки
```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Nginx
apt install nginx -y

# Установка Certbot для SSL
apt install certbot python3-certbot-nginx -y

# Создание директории
mkdir -p /var/www/webname.uz
chown -R www-data:www-data /var/www/webname.uz
```

### 3. Настройте DNS записи

В панели управления доменом `webname.uz` добавьте:

**A запись:**
- Имя: `@` (или пусто)
- Значение: `IP_АДРЕС_VPS` (узнайте командой `hostname -I` на VPS)
- TTL: 3600

**A запись для www:**
- Имя: `www`
- Значение: `IP_АДРЕС_VPS`
- TTL: 3600

### 4. Скопируйте конфигурацию Nginx

```bash
# На VPS скопируйте содержимое файла vps_nginx_config.conf
nano /etc/nginx/sites-available/webname.uz
# Вставьте конфигурацию из vps_nginx_config.conf
```

Или загрузите файл:
```bash
# С локального компьютера:
scp vps_nginx_config.conf root@95.46.96.53:/etc/nginx/sites-available/webname.uz
```

### 5. Активируйте конфигурацию
```bash
# На VPS:
ln -s /etc/nginx/sites-available/webname.uz /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 6. Получите SSL сертификат
```bash
# На VPS:
certbot --nginx -d webname.uz -d www.webname.uz
```

### 7. Загрузите приложение

**С локального компьютера:**
```bash
cd /Users/dulatea/uzbekservice_app
flutter build web --release
./deploy_to_vps.sh
```

Или вручную:
```bash
scp -r build/web/* root@95.46.96.53:/var/www/webname.uz/
```

### 8. Готово! 🎉

Откройте в браузере: https://webname.uz

## Полезные команды

```bash
# Проверка статуса Nginx
systemctl status nginx

# Перезапуск Nginx
systemctl restart nginx

# Просмотр логов
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Проверка конфигурации
nginx -t
```

## Автоматический деплой

После первого развертывания используйте скрипт:
```bash
./deploy_to_vps.sh
```

Скрипт автоматически:
- Соберет приложение
- Создаст бэкап
- Загрузит файлы
- Установит права
- Перезагрузит Nginx

