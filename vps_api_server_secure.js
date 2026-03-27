// API сервер для работы с PostgreSQL на VPS (с аутентификацией)
// Установка: npm install express pg cors dotenv
// Запуск: node vps_api_server_secure.js

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Проверка наличия API ключа
if (!API_KEY) {
  console.error('❌ ОШИБКА: API_KEY не установлен в .env файле!');
  console.error('   Установите API_KEY в /var/www/api/.env');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Middleware для проверки API ключа (кроме /health)
const apiKeyMiddleware = (req, res, next) => {
  // Health check доступен без ключа
  if (req.path === '/health') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'API ключ не предоставлен. Используйте заголовок X-API-Key.'
    });
  }
  
  if (apiKey !== API_KEY) {
    console.warn(`⚠️  Неверный API ключ с IP: ${req.ip}`);
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Неверный API ключ.'
    });
  }
  
  next();
};

app.use('/api', apiKeyMiddleware);

// Подключение к PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'uzbekservice_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'uzbekservice_db',
  password: process.env.DB_PASSWORD || 'Uzbekservice2026Secure',
  port: process.env.DB_PORT || 5432,
});

// Проверка подключения
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err);
  } else {
    console.log('✅ Подключено к PostgreSQL:', res.rows[0].now);
  }
});

// ==================== РОУТЫ ====================

// Health check (без аутентификации)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    api_secured: true
  });
});

// Получить чувствительные данные пользователя
app.get('/api/users/:id/sensitive', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM users_sensitive WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Сохранить/обновить чувствительные данные пользователя
app.post('/api/users/:id/sensitive', async (req, res) => {
  try {
    const { id } = req.params;
    const { phone_number, address, location, is_uzbek_citizen } = req.body;
    
    // Проверка обязательных полей
    if (!phone_number) {
      return res.status(400).json({ error: 'Номер телефона обязателен' });
    }
    
    // Проверка, существует ли пользователь
    const checkResult = await pool.query(
      'SELECT id FROM users_sensitive WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      // Создание нового пользователя
      const result = await pool.query(
        `INSERT INTO users_sensitive 
         (id, phone_number, address, location, is_uzbek_citizen) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [id, phone_number, address || null, location || null, is_uzbek_citizen !== undefined ? is_uzbek_citizen : true]
      );
      res.status(201).json(result.rows[0]);
    } else {
      // Обновление существующего пользователя
      const result = await pool.query(
        `UPDATE users_sensitive 
         SET phone_number = $2, address = $3, location = $4, is_uzbek_citizen = $5, updated_at = NOW()
         WHERE id = $1 
         RETURNING *`,
        [id, phone_number, address || null, location || null, is_uzbek_citizen !== undefined ? is_uzbek_citizen : true]
      );
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить только адрес и локацию
app.patch('/api/users/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { address, location } = req.body;
    
    const result = await pool.query(
      `UPDATE users_sensitive 
       SET address = $2, location = $3, updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id, address || null, location || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить пользователей по номеру телефона
app.get('/api/users/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const result = await pool.query(
      'SELECT * FROM users_sensitive WHERE phone_number = $1',
      [phone]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Сохранить чувствительные данные заказа
app.post('/api/orders/:id/sensitive', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, address, location, phone_number } = req.body;
    
    const result = await pool.query(
      `INSERT INTO orders_sensitive (id, user_id, address, location, phone_number)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         address = EXCLUDED.address,
         location = EXCLUDED.location,
         phone_number = EXCLUDED.phone_number,
         updated_at = NOW()
       RETURNING *`,
      [id, user_id, address || null, location || null, phone_number || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Статистика
app.get('/api/stats', async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users_sensitive');
    const ordersCount = await pool.query('SELECT COUNT(*) FROM orders_sensitive');
    
    res.json({
      users: parseInt(usersCount.rows[0].count),
      orders: parseInt(ordersCount.rows[0].count),
    });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API сервер запущен на порту ${PORT}`);
  console.log(`🔐 API защищен ключом аутентификации`);
  console.log(`📡 Доступен по адресу: http://localhost:${PORT}`);
});

