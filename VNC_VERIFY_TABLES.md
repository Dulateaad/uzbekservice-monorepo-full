# Проверка создания таблиц

## Таблицы созданы!

NOTICE сообщения показывают, что таблицы уже существуют - это нормально.

## Проверка таблиц (альтернативные способы)

### Способ 1: Прямой SQL запрос

```bash
su - postgres -c "psql -d uzbekservice_db -c \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';\""
```

### Способ 2: Подключение к psql

```bash
su - postgres
psql -d uzbekservice_db
\dt
\q
exit
```

### Способ 3: Проверка структуры таблицы

```bash
su - postgres -c "psql -d uzbekservice_db -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users_sensitive';\""
```

## Продолжайте с БЛОК 5

Таблицы созданы, продолжайте с установкой зависимостей:

```bash
cd /var/www/api && npm install && echo "Зависимости установлены"
```

