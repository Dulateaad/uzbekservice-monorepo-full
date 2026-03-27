-- SQL скрипт для создания таблиц в PostgreSQL
-- Выполните: psql -U uzbekservice_user -d uzbekservice_db -f vps_create_tables.sql

-- Таблица для чувствительных данных пользователей
CREATE TABLE IF NOT EXISTS users_sensitive (
    id VARCHAR(50) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    address TEXT,
    location JSONB, -- {lat: double, lng: double, address: string}
    is_uzbek_citizen BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_phone ON users_sensitive(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_location ON users_sensitive USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_users_created ON users_sensitive(created_at);

-- Таблица для заказов (чувствительные данные)
CREATE TABLE IF NOT EXISTS orders_sensitive (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users_sensitive(id),
    address TEXT,
    location JSONB,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для заказов
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders_sensitive(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders_sensitive(created_at);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_sensitive_updated_at 
    BEFORE UPDATE ON users_sensitive 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_sensitive_updated_at 
    BEFORE UPDATE ON orders_sensitive 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Комментарии к таблицам
COMMENT ON TABLE users_sensitive IS 'Чувствительные данные пользователей (хранятся в Узбекистане)';
COMMENT ON TABLE orders_sensitive IS 'Чувствительные данные заказов (хранятся в Узбекистане)';

-- Вывод информации
SELECT 'Таблицы созданы успешно!' AS status;
\d users_sensitive
\d orders_sensitive

