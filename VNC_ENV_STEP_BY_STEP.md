# Пошаговое создание .env на VPS

## ✅ Начало создано! Продолжайте построчно

Вы уже создали первую строку. Продолжайте в VNC терминале:

```bash
cd /var/www/api

# Проверяем, что начало есть
cat .env

# Добавляем остальные строки по одной
echo "DB_USER=uzbekservice_user" >> .env && cat .env
echo "DB_HOST=localhost" >> .env && cat .env
echo "DB_NAME=uzbekservice_db" >> .env && cat .env
echo "DB_PASSWORD=Uzbekservice2026Secure" >> .env && cat .env
echo "DB_PORT=5432" >> .env && cat .env
echo "NODE_ENV=production" >> .env && cat .env

# Генерируем API ключ
API_KEY=$(openssl rand -hex 32)

# Показываем ключ (ВАЖНО: скопируйте его!)
echo "=========================================="
echo "ВАШ API КЛЮЧ (скопируйте его!):"
echo "$API_KEY"
echo "=========================================="

# Добавляем API ключ в файл
echo "API_KEY=$API_KEY" >> .env

# Финальная проверка
echo ""
echo "✅ Файл создан. Проверка:"
cat .env

echo ""
echo "API_KEY из файла:"
grep API_KEY .env
```

---

## Или все сразу (если хотите быстрее)

```bash
cd /var/www/api

# Генерируем ключ
API_KEY=$(openssl rand -hex 32)

# Показываем ключ
echo "API_KEY=$API_KEY"
echo "⚠️  Скопируйте этот ключ!"

# Добавляем все строки
echo "DB_USER=uzbekservice_user" >> .env
echo "DB_HOST=localhost" >> .env
echo "DB_NAME=uzbekservice_db" >> .env
echo "DB_PASSWORD=Uzbekservice2026Secure" >> .env
echo "DB_PORT=5432" >> .env
echo "NODE_ENV=production" >> .env
echo "API_KEY=$API_KEY" >> .env

# Проверяем
cat .env
```

---

## Проверка

```bash
# Должен показать 8 строк
wc -l .env

# Должен показать все содержимое
cat .env

# Должен показать API_KEY
grep API_KEY .env
```

---

## ✅ После создания

1. **Скопируйте API ключ** - он показан в выводе
2. **Проверьте файл:** `cat /var/www/api/.env`
3. **Продолжайте с заменой API сервера** (см. VNC_REPLACE_API_SERVER.md)

