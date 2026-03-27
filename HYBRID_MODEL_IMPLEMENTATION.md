# Реализация гибридной модели хранения данных

## 🎯 Цель: Вариант 1 - Гибридная модель

Хранить чувствительные данные граждан Узбекистана на VPS в Узбекистане, остальные данные в Firebase.

## 📊 Разделение данных

### 🔴 VPS Узбекистан (PostgreSQL) - Чувствительные данные:
- ✅ Номера телефонов узбекских пользователей
- ✅ Адреса пользователей
- ✅ Геолокация (координаты)
- ✅ Финансовые данные (если есть)
- ✅ Паспортные данные (если собираете)

### 🟢 Firebase (за рубежом) - Нечувствительные данные:
- ✅ Имена пользователей
- ✅ Email адреса
- ✅ Аватары/фото профилей
- ✅ Рейтинги и отзывы
- ✅ Категории услуг
- ✅ Общая аналитика (анонимизированная)
- ✅ Чаты и сообщения (можно оставить в Firebase)

## 🏗️ Архитектура

```
┌─────────────────────────────────┐
│    Flutter Application           │
└───────────┬─────────────────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌──────────┐    ┌──────────┐
│ VPS API  │    │ Firebase │
│ (Узбек)  │    │ (Загран) │
└────┬─────┘    └────┬─────┘
     │               │
     ▼               ▼
┌──────────┐    ┌──────────┐
│PostgreSQL│    │ Firestore│
│(Узбекистан)│  │ (Загран) │
└──────────┘    └──────────┘
```

## 📋 Этап 1: Настройка PostgreSQL на VPS

### Команды для выполнения на VPS:

```bash
# 1. Установка PostgreSQL
dnf install -y postgresql15-server postgresql15

# 2. Инициализация
postgresql-setup --initdb

# 3. Запуск
systemctl start postgresql
systemctl enable postgresql

# 4. Создание БД и пользователя
su - postgres
createdb uzbekservice_db
createuser uzbekservice_user
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'ВАШ_НАДЕЖНЫЙ_ПАРОЛЬ';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"
exit
```

## 📋 Этап 2: Создание структуры БД

### Таблицы для чувствительных данных:

```sql
-- Пользователи (чувствительные данные)
CREATE TABLE users_sensitive (
    id VARCHAR(50) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    address TEXT,
    location JSONB, -- {lat, lng, address}
    is_uzbek_citizen BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_users_phone ON users_sensitive(phone_number);
CREATE INDEX idx_users_location ON users_sensitive USING GIN(location);
```

## 📋 Этап 3: Создание API сервера

API будет работать на VPS и предоставлять endpoints для:
- Регистрации пользователей
- Хранения чувствительных данных
- Получения данных по ID

## 📋 Этап 4: Обновление Flutter приложения

Создать новый сервис, который:
- Определяет, является ли пользователь гражданином Узбекистана
- Сохраняет чувствительные данные на VPS
- Сохраняет нечувствительные данные в Firebase

## 📋 Этап 5: Миграция данных

Скрипт для миграции существующих данных из Firebase в PostgreSQL.

## 🔒 Безопасность

- ✅ HTTPS только
- ✅ Аутентификация API (JWT токены)
- ✅ Ограничение доступа по IP
- ✅ Шифрование БД
- ✅ Логирование доступа

## ⏱️ Временные рамки

- **Неделя 1:** Настройка PostgreSQL и API
- **Неделя 2:** Обновление приложения
- **Неделя 3:** Миграция данных и тестирование

