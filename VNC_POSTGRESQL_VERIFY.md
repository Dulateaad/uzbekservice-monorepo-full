# Проверка и настройка PostgreSQL

## 🔍 Шаг 1: Поиск psql

Выполните:

```bash
which psql
```

Или:

```bash
find /usr -name psql 2>/dev/null
```

---

## 🔍 Шаг 2: Проверка версии через полный путь

Обычно psql находится в `/usr/bin/psql` или `/usr/pgsql-*/bin/psql`. Попробуйте:

```bash
/usr/bin/psql --version
```

Или проверьте установленные пакеты:

```bash
rpm -qa | grep postgresql
```

---

## 🔍 Шаг 3: Проверка статуса службы

```bash
systemctl status postgresql --no-pager
```

---

## ✅ Шаг 4: Создание БД и пользователя

Если PostgreSQL работает (служба запущена), можно сразу создавать БД. Выполните:

```bash
su - postgres
```

Затем внутри сессии postgres:

```bash
createdb uzbekservice_db
```

```bash
createuser uzbekservice_user
```

```bash
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'Uzbekservice2026Secure';"
```

```bash
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"
```

```bash
exit
```

---

## 🔍 Шаг 5: Проверка подключения

Попробуйте подключиться к БД:

```bash
su - postgres -c "psql -U uzbekservice_user -d uzbekservice_db -c 'SELECT version();'"
```

---

## 📋 Дальнейшие шаги

После успешного создания БД продолжайте с **Блока 3** (Установка Node.js) из `VNC_FIXED_COMMANDS.md`.

