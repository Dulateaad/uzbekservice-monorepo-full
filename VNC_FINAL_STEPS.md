# Финальные шаги на VPS

## ✅ Выполнено:
- .env файл загружен на VPS
- API ключ обновлен в Flutter приложении

## 📋 Осталось выполнить на VPS (через VNC терминал):

### Шаг 1: Проверьте .env файл

```bash
cd /var/www/api
cat .env
```

Должен показать:
```
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026Secure
DB_PORT=5432
NODE_ENV=production
API_KEY=2a206f0a3fd3edbe1a06902a99dc4874ec3213449a70768149b98211cdcfb8a0
```

### Шаг 2: Замените API сервер на защищенную версию

```bash
cd /var/www/api

cat > vps_api_server.js <<'SERVEREOF'
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use(cors());
app.use(express.json());

// Middleware для аутентификации
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const clientApiKey = req.headers['x-api-key'];
  if (!clientApiKey || clientApiKey !== API_KEY) {
    return res.status(401).json({ error: 'Неверный API ключ' });
  }
  next();
});

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Ошибка БД:', err);
  else console.log('БД подключена:', res.rows[0].now);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users/:id/sensitive', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM users_sensitive WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Не найден' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/users/:id/sensitive', async (req, res) => {
  try {
    const { id } = req.params;
    const { phone_number, address, location, is_uzbek_citizen } = req.body;
    if (!phone_number) return res.status(400).json({ error: 'Номер телефона обязателен' });
    
    const check = await pool.query('SELECT id FROM users_sensitive WHERE id = $1', [id]);
    
    if (check.rows.length === 0) {
      const result = await pool.query(
        'INSERT INTO users_sensitive (id, phone_number, address, location, is_uzbek_citizen) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, phone_number, address, location, is_uzbek_citizen !== undefined ? is_uzbek_citizen : true]
      );
      res.status(201).json(result.rows[0]);
    } else {
      const result = await pool.query(
        'UPDATE users_sensitive SET phone_number = $2, address = $3, location = $4, is_uzbek_citizen = $5, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id, phone_number, address, location, is_uzbek_citizen !== undefined ? is_uzbek_citizen : true]
      );
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users_sensitive');
    res.json({ users: parseInt(users.rows[0].count) });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('API сервер запущен на порту', PORT);
});
SERVEREOF
```

### Шаг 3: Перезапустите сервис

```bash
systemctl restart uzbekservice-api
systemctl status uzbekservice-api --no-pager
```

### Шаг 4: Проверьте работу

```bash
# Health check (без API ключа - должен работать)
curl http://localhost:3000/health

# API запрос без ключа - должен вернуть 401
curl http://localhost:3000/api/stats

# API запрос с ключом - должен работать
curl -H "X-API-Key: 2a206f0a3fd3edbe1a06902a99dc4874ec3213449a70768149b98211cdcfb8a0" http://localhost:3000/api/stats
```

---

## ✅ После выполнения всех шагов

Гибридная модель будет полностью настроена:
- ✅ PostgreSQL работает
- ✅ Резервное копирование настроено
- ✅ API защищен ключом
- ✅ Flutter приложение использует API ключ

