# Загрузка .env файла с локальной машины

## Проблема: Не удается создать .env на VPS

## Решение: Создать файл локально и загрузить

### Шаг 1: Создание файла на Mac

Файл уже создан в `/tmp/vps_env_template.txt` с API ключом.

### Шаг 2: Получение API ключа

Выполните на Mac:

```bash
cat /tmp/vps_env_template.txt | grep API_KEY
```

Скопируйте ключ - он понадобится для Flutter приложения.

### Шаг 3: Загрузка на VPS

Выполните на Mac:

```bash
scp /tmp/vps_env_template.txt root@95.46.96.53:/var/www/api/.env
```

Введите пароль VPS когда запросит.

### Шаг 4: Проверка на VPS

В VNC терминале выполните:

```bash
cd /var/www/api
cat .env
grep API_KEY .env
ls -lh .env
```

---

## Альтернатива: Создать файл вручную на VPS

Если scp не работает, создайте файл вручную через vi:

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
2. Вставьте (замените YOUR_KEY на ключ выше):
```
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026Secure
DB_PORT=5432
NODE_ENV=production
API_KEY=YOUR_KEY
```
3. Нажмите `Esc`
4. Введите `:wq` и нажмите `Enter`

---

## ✅ После создания файла

1. **Проверьте файл:**
   ```bash
   cat /var/www/api/.env
   ```

2. **Скопируйте API ключ** для Flutter приложения

3. **Продолжайте с заменой API сервера** (см. VNC_REPLACE_API_SERVER.md)

