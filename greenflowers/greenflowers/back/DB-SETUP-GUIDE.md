# 🔧 Восстановление подключения к PostgreSQL

## Проблема

PostgreSQL требует пароль для пользователя `postgres`, но текущий пароль (`postgres` или `Sula2206`) не подходит.

## Решение 1: Найти правильный пароль (быстро)

```bash
# Если помнишь какой пароль вводил при инсталляции PostgreSQL - используй его
# Обнови в .env:
DB_PASSWORD=<правильный_пароль>
```

## Решение 2: Установить новый пароль (требует администратора)

### Шаг 1: Остановить PostgreSQL сервис

```powershell
# Как администратор
Stop-Service postgresql-x64-17 -Force
```

### Шаг 2: Отредактировать pg_hba.conf

Файл обычно: `C:\Program Files\PostgreSQL\17\data\pg_hba.conf`

Найти строку:

```
local   all             all                                     scram-sha-256
```

Изменить на:

```
local   all             all                                     trust
```

Сохранить файл.

### Шаг 3: Запустить сервис

```powershell
Start-Service postgresql-x64-17
```

### Шаг 4: Установить пароль

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

### Шаг 5: Вернуть конфиг обратно

В `pg_hba.conf` изменить `trust` обратно на `scram-sha-256` и перезагрузить сервис.

### Шаг 6: Обновить .env

```
DB_PASSWORD=postgres
```

## Решение 3: Быстро (без утратыданных)

Используй подкоманду pg_ctl:

```bash
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "C:\Program Files\PostgreSQL\17\data" -U postgres setval -A "ALTER USER postgres WITH PASSWORD 'postgres';"
```

## Проверка

```bash
node test-db-connection.js
```

Должно вывести:

```
✅ Connection successful!
Current time: ...
```

---

## Если все ещё не работает

1. **Список пользователей PostgreSQL:**

   ```
   SELECT usename FROM pg_user;
   ```

2. **Переустановить PostgreSQL:**
   - Удалить: `C:\Program Files\PostgreSQL\*`
   - Удалить: `C:\Program Files (x86)\PostgreSQL\*`
   - Переустановить с известным паролем

---

## Рекомендуемые пароли

- `postgres` (стандартный)
- `admin`
- `password`
- `localhost`
- То, что ввёл при инсталляции
