# Создание файлов прямо на VPS

## 📝 Блок 1: Создание SQL файла для таблиц

Выполните в VNC терминале:

```bash
cat > /root/setup/vps_create_tables.sql <<'SQLEOF'
-- SQL скрипт для создания таблиц в PostgreSQL
-- Выполните: psql -U uzbekservice_user -d uzbekservice_db -f vps_create_tables.sql

-- Таблица для чувствительных данных пользователей
CREATE TABLE IF NOT EXISTS users_sensitive (
    id VARCHAR(50) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    address TEXT,
    location JSONB,
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
SQLEOF
echo "SQL файл создан"
```

---

## 📝 Блок 2: Создание package.json

```bash
cat > /var/www/api/package.json <<'PKGEOF'
{
  "name": "uzbekservice-vps-api",
  "version": "1.0.0",
  "description": "API сервер для хранения чувствительных данных на VPS в Узбекистане",
  "main": "vps_api_server.js",
  "scripts": {
    "start": "node vps_api_server.js",
    "dev": "nodemon vps_api_server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "keywords": [
    "api",
    "postgresql",
    "uzbekistan",
    "data-compliance"
  ],
  "author": "ODO.UZ",
  "license": "ISC"
}
PKGEOF
echo "package.json создан"
```

---

## 📝 Блок 3: Создание API сервера

```bash
cat > /var/www/api/vps_api_server.js <<'JSEOF'
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'uzbekservice_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'uzbekservice_db',
  password: process.env.DB_PASSWORD || 'Uzbekservice2026Secure',
  port: process.env.DB_PORT || 5432,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err);
  } else {
    console.log('✅ Подключено к PostgreSQL:', res.rows[0].now);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/sensitive-user-data', async (req, res) => {
  const { userId, phoneNumber, address, latitude, longitude } = req.body;

  if (!userId || !phoneNumber) {
    return res.status(400).json({ error: 'userId and phoneNumber are required' });
  }

  try {
    const location = (latitude && longitude) ? { lat: latitude, lng: longitude, address: address } : null;
    
    const result = await pool.query(
      `INSERT INTO users_sensitive (id, phone_number, address, location)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         phone_number = $2,
         address = $3,
         location = $4,
         updated_at = NOW()
       RETURNING *`,
      [userId, phoneNumber, address || null, location ? JSON.stringify(location) : null]
    );
    
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error saving sensitive user data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sensitive-user-data/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, phone_number, address, location FROM users_sensitive WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Error fetching sensitive user data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API сервер запущен на порту ${PORT}`);
  console.log(`📡 Доступен по адресу: http://localhost:${PORT}`);
});
JSEOF
echo "API сервер создан"
```

---

## ✅ После создания файлов

Продолжайте с:
1. Создание таблиц (Блок 6)
2. Установка зависимостей (Блок 7)
3. Создание .env (Блок 8)
4. И т.д. из VNC_NEXT_STEPS.md

