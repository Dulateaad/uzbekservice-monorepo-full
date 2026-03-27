# Финальное создание .env файла (без nano)

## ✅ Используйте команды (nano не установлен)

Выполните в VNC терминале:

```bash
cd /var/www/api

# Генерируем API ключ
API_KEY=$(openssl rand -hex 32)

# Показываем ключ (ВАЖНО: скопируйте его!)
echo "=========================================="
echo "ВАШ API КЛЮЧ (скопируйте его!):"
echo "$API_KEY"
echo "=========================================="

# Создаем .env файл через printf
printf "PORT=3000\nDB_USER=uzbekservice_user\nDB_HOST=localhost\nDB_NAME=uzbekservice_db\nDB_PASSWORD=Uzbekservice2026Secure\nDB_PORT=5432\nNODE_ENV=production\nAPI_KEY=$API_KEY\n" > .env

# Проверяем файл
echo ""
echo "✅ Файл создан. Проверка:"
cat .env

echo ""
echo "API_KEY из файла:"
grep API_KEY .env

# Проверяем размер
echo ""
echo "Размер файла:"
wc -l .env
ls -lh .env
```

---

## Альтернативный способ (построчно)

Если printf не работает:

```bash
cd /var/www/api

# Генерируем ключ
API_KEY=$(openssl rand -hex 32)
echo "API_KEY=$API_KEY"
echo "⚠️  Скопируйте этот ключ!"

# Удаляем старый файл
rm -f .env

# Создаем построчно
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

## Проверка после создания

```bash
# Должен показать все строки
cat /var/www/api/.env

# Должен показать API_KEY
grep API_KEY /var/www/api/.env

# Должен показать 8 строк
wc -l /var/www/api/.env

# Размер файла (не должен быть 0)
ls -lh /var/www/api/.env
```

---

## ✅ После успешного создания

1. **Скопируйте API ключ** - он показан в выводе
2. **Проверьте файл:** `cat /var/www/api/.env`
3. **Продолжайте с заменой API сервера** (см. VNC_REPLACE_API_SERVER.md)

---

## 🆘 Если все еще не работает

Попробуйте использовать `vi` (если установлен):

```bash
cd /var/www/api

# Генерируем ключ
API_KEY=$(openssl rand -hex 32)
echo "API_KEY=$API_KEY"
echo "⚠️  Скопируйте этот ключ!"

# Создаем файл через vi
vi .env
```

В vi:
1. Нажмите `i` для вставки
2. Вставьте содержимое:
```
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026Secure
DB_PORT=5432
NODE_ENV=production
API_KEY=ВАШ_КЛЮЧ_ЗДЕСЬ
```
3. Нажмите `Esc`, затем `:wq` и `Enter` для сохранения

