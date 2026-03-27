# Настройка API ключа

## ✅ API ключ сгенерирован!

Вы должны были увидеть что-то вроде:
```
Ваш API ключ: a1b2c3d4e5f6...
```

## 📝 Важно: Сохраните этот ключ!

Скопируйте ключ и сохраните в безопасном месте. Он понадобится для:
1. Настройки API сервера
2. Обновления Flutter приложения

---

## Шаг 1: Добавление API ключа в .env

Выполните в VNC терминале (замените YOUR_API_KEY на реальный ключ):

```bash
cd /var/www/api
echo "API_KEY=YOUR_API_KEY" >> .env
cat .env
```

**Пример:**
```bash
echo "API_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" >> .env
```

---

## Шаг 2: Замена API сервера

### Вариант A: Использовать готовый файл (если загрузили)

```bash
cd /var/www/api
cp vps_api_server.js vps_api_server.js.backup
cp vps_api_server_secure.js vps_api_server.js
```

### Вариант B: Создать защищенный сервер вручную

```bash
cd /var/www/api
cp vps_api_server.js vps_api_server.js.backup

# Создаем новый защищенный сервер
cat > vps_api_server_secure_temp.js <<'JSEOF'
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('❌ ОШИБКА: API_KEY не установлен в .env файле!');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

const apiKeyMiddleware = (req, res, next) => {
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
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    api_secured: true
  });
});

// ... (скопируйте остальные роуты из vps_api_server.js)
JSEOF

# Затем скопируйте остальные роуты из старого файла
```

**Проще:** Используйте готовый файл `vps_api_server_secure.js` из проекта.

---

## Шаг 3: Обновление systemd service

```bash
# Перезагружаем конфигурацию
systemctl daemon-reload

# Перезапускаем сервис
systemctl restart uzbekservice-api

# Проверяем статус
systemctl status uzbekservice-api --no-pager

# Проверяем логи
journalctl -u uzbekservice-api -n 20
```

---

## Шаг 4: Тестирование

```bash
# Без ключа (должна быть ошибка 401)
curl http://localhost:3000/api/stats

# С ключом (должен работать)
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:3000/api/stats
```

---

## Шаг 5: Обновление Flutter приложения

После настройки API ключа на VPS:

1. Откройте `lib/services/vps_api_service.dart`
2. Найдите строку: `static const String _apiKey = 'YOUR_API_KEY_HERE';`
3. Замените `YOUR_API_KEY_HERE` на реальный API ключ
4. Сохраните файл

---

## ✅ Готово!

После выполнения всех шагов API будет защищен ключом аутентификации.

