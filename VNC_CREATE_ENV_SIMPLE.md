# Простое создание .env файла

## Проблема: .env файл пустой или не создан

## Решение: Создайте файл пошагово

Выполните в VNC терминале:

```bash
cd /var/www/api

# Проверяем текущую директорию
pwd

# Проверяем, существует ли .env
ls -la .env

# Генерируем API ключ
API_KEY=$(openssl rand -hex 32)

# Показываем ключ (ВАЖНО: скопируйте его!)
echo "=========================================="
echo "ВАШ API КЛЮЧ (скопируйте его!):"
echo "$API_KEY"
echo "=========================================="

# Создаем .env файл построчно
echo "PORT=3000" > .env
echo "DB_USER=uzbekservice_user" >> .env
echo "DB_HOST=localhost" >> .env
echo "DB_NAME=uzbekservice_db" >> .env
echo "DB_PASSWORD=Uzbekservice2026Secure" >> .env
echo "DB_PORT=5432" >> .env
echo "NODE_ENV=production" >> .env
echo "API_KEY=$API_KEY" >> .env

# Проверяем созданный файл
echo ""
echo "✅ .env файл создан:"
cat .env

# Проверяем API_KEY
echo ""
echo "API_KEY из файла:"
grep API_KEY .env
```

---

## Альтернативный способ (одной командой)

```bash
cd /var/www/api

# Генерируем ключ
API_KEY=$(openssl rand -hex 32)

# Показываем ключ
echo "API_KEY=$API_KEY"
echo "⚠️  Скопируйте этот ключ!"

# Создаем .env
{
  echo "PORT=3000"
  echo "DB_USER=uzbekservice_user"
  echo "DB_HOST=localhost"
  echo "DB_NAME=uzbekservice_db"
  echo "DB_PASSWORD=Uzbekservice2026Secure"
  echo "DB_PORT=5432"
  echo "NODE_ENV=production"
  echo "API_KEY=$API_KEY"
} > .env

# Проверяем
cat .env
```

---

## Проверка

```bash
# Должен показать все переменные
cat /var/www/api/.env

# Должен показать API_KEY
grep API_KEY /var/www/api/.env

# Размер файла (не должен быть 0)
ls -lh /var/www/api/.env
```

---

## ✅ После создания

1. **Скопируйте API ключ** - он показан в выводе
2. **Проверьте файл:** `cat /var/www/api/.env`
3. **Продолжайте с заменой API сервера** (см. VNC_REPLACE_API_SERVER.md)

---

## Если все еще не работает

Проверьте права доступа:

```bash
cd /var/www/api
touch .env
chmod 644 .env
ls -la .env
```

Затем создайте файл заново одним из способов выше.

