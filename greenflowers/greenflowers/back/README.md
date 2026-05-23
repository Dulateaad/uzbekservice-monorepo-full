# Инструкция по настройке базы данных

## Шаг 1: Создайте базу данных PostgreSQL

### Через pgAdmin или командную строку PostgreSQL:

```sql
CREATE DATABASE greenflowers_db;
```

### Или через psql:

```bash
psql -U postgres
CREATE DATABASE greenflowers_db;
\q
```

## Шаг 2: Запустите SQL скрипт

```bash
psql -U postgres -d greenflowers_db -f database.sql
```

Или скопируйте содержимое файла `database.sql` и выполните в pgAdmin.

## Шаг 3: Настройте .env файл

Откройте `.env` и укажите ваши данные для подключения:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=greenflowers_db
DB_USER=postgres
DB_PASSWORD=ваш_пароль
```

## Шаг 4: Запустите сервер

```bash
npm run dev
```

Сервер запустится на http://localhost:5000

## Проверка подключения

Откройте в браузере:
- http://localhost:5000 - главная страница API
- http://localhost:5000/api/health - проверка здоровья
- http://localhost:5000/api/db-test - проверка подключения к БД

## Созданные таблицы:

1. **users** - пользователи (клиенты, сотрудники, админы)
2. **products** - каталог цветов
3. **orders** - заказы
4. **order_items** - позиции в заказах
5. **preorders** - предзаказы
6. **delivery_zones** - зоны доставки
7. **delivery_schedules** - расписание поставок
8. **cart_items** - корзина покупок

## Тестовые пользователи:

- **Админ:** admin@greenflowers.kz
- **Сотрудник:** worker@greenflowers.kz  
- **Клиент:** client@test.kz

(Пароли нужно будет хешировать через bcrypt)
