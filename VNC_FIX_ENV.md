# Исправление .env файла

## Проблема: .env файл пустой или API_KEY отсутствует

## Решение: Создайте .env файл заново

Выполните в VNC терминале:

```bash
cd /var/www/api

# Проверяем текущий .env
cat .env

# Генерируем новый API ключ
API_KEY=$(openssl rand -hex 32)

# Создаем .env файл заново
cat > .env <<ENVEOF
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026Secure
DB_PORT=5432
NODE_ENV=production
API_KEY=$API_KEY
ENVEOF

# Показываем ключ
echo "=========================================="
echo "ВАШ API КЛЮЧ:"
echo "$API_KEY"
echo "=========================================="
echo ""
echo "⚠️  ВАЖНО: Скопируйте этот ключ!"

# Проверяем .env
echo ""
echo "✅ .env файл создан:"
cat .env
```

---

## Альтернативный способ (если .env уже существует)

```bash
cd /var/www/api

# Генерируем ключ
API_KEY=$(openssl rand -hex 32)

# Добавляем в конец .env
echo "API_KEY=$API_KEY" >> .env

# Показываем ключ
echo "=========================================="
echo "ВАШ API КЛЮЧ:"
echo "$API_KEY"
echo "=========================================="

# Проверяем
grep API_KEY .env
```

---

## После создания .env

1. **Скопируйте API ключ** - он показан выше
2. **Проверьте .env:**
   ```bash
   cat /var/www/api/.env
   ```
3. **Продолжайте с заменой API сервера** (см. VNC_SHOW_API_KEY.md)

---

## Проверка

```bash
# Должно показать все переменные
cat /var/www/api/.env

# Должно показать API_KEY
grep API_KEY /var/www/api/.env
```

