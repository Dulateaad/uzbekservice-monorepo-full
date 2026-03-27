# Прямое создание .env файла

## Проблема: Команды не выводят результат

## Решение: Создайте файл напрямую

Выполните в VNC терминале **по одной команде**:

```bash
cd /var/www/api
```

```bash
rm -f .env
```

```bash
echo "PORT=3000" > .env
```

```bash
echo "DB_USER=uzbekservice_user" >> .env
```

```bash
echo "DB_HOST=localhost" >> .env
```

```bash
echo "DB_NAME=uzbekservice_db" >> .env
```

```bash
echo "DB_PASSWORD=Uzbekservice2026Secure" >> .env
```

```bash
echo "DB_PORT=5432" >> .env
```

```bash
echo "NODE_ENV=production" >> .env
```

```bash
API_KEY=$(openssl rand -hex 32)
```

```bash
echo "API_KEY=$API_KEY" >> .env
```

```bash
echo "API_KEY=$API_KEY"
```

```bash
cat .env
```

---

## Проверка после каждой команды

После выполнения каждой команды проверяйте:

```bash
# После создания файла
ls -la .env

# После добавления каждой строки
cat .env

# После добавления API_KEY
grep API_KEY .env
```

---

## Если все еще не работает

Попробуйте создать файл через `cat` с явным указанием содержимого:

```bash
cd /var/www/api

# Генерируем ключ и сохраняем в переменную
API_KEY=$(openssl rand -hex 32)

# Показываем ключ
echo "Сгенерированный ключ: $API_KEY"

# Создаем файл через cat с heredoc (БЕЗ кавычек вокруг ENVEOF!)
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

# Проверяем
cat .env
```

**Важно:** Используйте `<<ENVEOF` без кавычек, чтобы переменная `$API_KEY` подставилась!

---

## Финальная проверка

```bash
# Должен показать 8 строк
wc -l /var/www/api/.env

# Должен показать все содержимое
cat /var/www/api/.env

# Должен показать API_KEY
grep API_KEY /var/www/api/.env

# Размер файла (не должен быть 0)
ls -lh /var/www/api/.env
```

---

## ✅ После успешного создания

1. **Скопируйте API ключ** из вывода `echo "API_KEY=$API_KEY"`
2. **Проверьте файл:** `cat /var/www/api/.env`
3. **Продолжайте с заменой API сервера**

