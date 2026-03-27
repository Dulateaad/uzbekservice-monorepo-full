# Информация о VPS

## Данные сервера

- **Домен VPS:** gaysyrdl.vps.webspace.uz
- **IP адрес:** 95.46.96.53
- **Домен сайта:** webname.uz
- **Характеристики:** 4x1500MHz, 8GB RAM, 30GB SSD
- **Период:** 26.01.2026 - 26.02.2026

## Подключение

```bash
ssh root@95.46.96.53
```

## DNS настройки для webname.uz

В панели управления доменом `webname.uz` добавьте:

### A запись (основной домен):
```
Тип: A
Имя: @ (или пусто)
Значение: 95.46.96.53
TTL: 3600
```

### A запись (www):
```
Тип: A
Имя: www
Значение: 95.46.96.53
TTL: 3600
```

## Быстрый деплой

```bash
# Соберите приложение
flutter build web --release

# Задеплойте автоматически
./deploy_to_vps.sh
```

Или вручную:
```bash
scp -r build/web/* root@95.46.96.53:/var/www/webname.uz/
```

## Проверка подключения

```bash
# Ping
ping -c 4 95.46.96.53

# SSH
ssh root@95.46.96.53
```

## Полезные команды на VPS

```bash
# Проверка IP
ip addr show

# Проверка статуса Nginx
systemctl status nginx

# Просмотр логов
tail -f /var/log/nginx/error.log
```

