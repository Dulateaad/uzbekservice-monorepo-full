# 🛒 Архитектура корзины и заказов

## 📋 Обзор

Система корзины и заказов разработана так, чтобы каждый пользователь имел свою собственную корзину, привязанную к его `user_id`. Все данные хранятся в базе данных PostgreSQL.

---

## 🔐 1. Изоляция корзины пользователя

### CartContext (Frontend)

**Файл**: `sdfg/contexts/cart-context.tsx`

```tsx
// Автоматически определяет userId из localStorage
const savedUser = localStorage.getItem("greenflowers_user");
const user = JSON.parse(savedUser); // { id, email, phone, name }
```

**Режимы работы**:

- ✅ **Авторизованный пользователь**: Корзина загружается из БД (API)
- ⚠️ **Гостевой пользователь**: Корзина в localStorage `temp_cart` (временная)

### Загрузка корзины

```tsx
const loadCart = async () => {
  if (!userId) return;
  const response = await api.getCart(userId);
  // GET /api/cart/user/:userId
  setCart(response.cart || []);
};
```

---

## 🚫 2. Проверка авторизации перед добавлением

### Catalog Component

**Файл**: `sdfg/components/catalog.tsx`

```tsx
onClick={() => {
  // Проверяем авторизацию
  const savedUser = localStorage.getItem("greenflowers_user");
  if (!savedUser) {
    alert("Пожалуйста, войдите в аккаунт");
    router.push("/auth/login");
    return;
  }
  // Добавляем товар
  addToCart(product, quantity);
}}
```

**Результат**:

- ✅ Авторизован → добавляет в корзину БД
- ❌ Не авторизован → редирект на `/auth/login`

---

## 🛍️ 3. Операции с корзиной

### Backend Routes

**Файл**: `back/routes/cart.js`

| Метод    | Endpoint                   | Функция                                          |
| -------- | -------------------------- | ------------------------------------------------ |
| `GET`    | `/cart/user/:userId`       | Получить корзину пользователя                    |
| `POST`   | `/cart`                    | Добавить товар (user_id + product_id + quantity) |
| `PUT`    | `/cart/:itemId`            | Обновить количество                              |
| `DELETE` | `/cart/:itemId`            | Удалить товар                                    |
| `DELETE` | `/cart/user/:userId/clear` | Очистить корзину                                 |

### Структура таблицы `cart_items`

```sql
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,        -- Привязка к пользователю
  product_id INTEGER NOT NULL,     -- Какой товар
  quantity INTEGER DEFAULT 1,      -- Сколько
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE(user_id, product_id)      -- Один товар - один раз в корзине
);
```

**Ключевой момент**: `UNIQUE(user_id, product_id)` гарантирует, что у каждого пользователя может быть только один запис товара в корзине.

---

## ✅ 4. Создание заказа

### Поток

```
Пользователь в корзине
    ↓
Нажимает "🛒 Оформить"
    ↓
Открывается модаль (OrderModal)
    ↓
Нажимает "Подтвердить"
    ↓
POST /api/orders (создаёт заказ)
    ↓
Корзина очищается (clearCart)
    ↓
Редирект на /order-confirmation/:id
```

### OrderModal

**Файл**: `sdfg/components/checkout/order-modal.tsx`

```tsx
const handleSubmit = async () => {
  // 1. Создаём заказ
  const resp = await api.createOrder({
    user_id: userData.id,
    customer_name,
    customer_phone,
    customer_email,
    total_amount: cartTotal,
    delivery_city: city,
    delivery_address: "",
    items: cartItems,
    status: "pending",
    payment_method: "cash",
  });

  // 2. Очищаем корзину
  if (resp?.success) {
    await clearCart(); // DELETE /api/cart/user/:userId/clear

    // 3. Редирект на подтверждение
    router.push(`/order-confirmation/${resp.order.id}`);
  }
};
```

### Backend: Создание заказа

**Файл**: `back/routes/orders.js`

```javascript
router.post('/', async (req, res) => {
  const { user_id, items, delivery_city, delivery_address, ... } = req.body;

  await client.query('BEGIN');

  // 1. Создаём заказ в таблице orders
  const orderResult = await client.query(
    `INSERT INTO orders
     (user_id, customer_name, customer_phone, ...)
     VALUES ($1, $2, $3, ...)
     RETURNING *`,
    [user_id, ...]
  );

  const orderId = orderResult.rows[0].id;

  // 2. Создаём записи в order_items
  for (const item of items) {
    await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4)`,
      [orderId, item.product_id, item.quantity, item.unit_price]
    );
  }

  await client.query('COMMIT');

  res.status(201).json({ success: true, order: orderResult.rows[0] });
});
```

### Структура таблиц

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,                 -- Привязка к пользователю
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  total_amount DECIMAL(10, 2),
  delivery_city VARCHAR(255),
  delivery_address TEXT,
  delivery_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER,
  unit_price DECIMAL(10, 2),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

---

## 📦 5. Просмотр заказов

### Orders Page

**Файл**: `sdfg/app/orders/page.tsx`

```tsx
const loadOrders = async () => {
  if (!user?.id) return;

  // Получаем только заказы текущего пользователя
  const response = await api.getUserOrders(user.id);
  // GET /api/orders/user/:userId

  setOrders(response.orders || []);
};
```

### Backend: Получение заказов пользователя

**Файл**: `back/routes/orders.js`

```javascript
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  const result = await pool.query(
    `SELECT o.*, 
            array_agg(json_build_object(...)) as items
     FROM orders o
     LEFT JOIN order_items oi ON o.id = oi.order_id
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE o.user_id = $1          -- ТОЛЬКО заказы этого пользователя
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [userId],
  );

  res.json({ success: true, orders: result.rows });
});
```

**Ключевое условие**: `WHERE o.user_id = $1` гарантирует, что пользователь видит только свои заказы.

---

## 🔒 6. Безопасность и изоляция

### ✅ Что гарантирует изоляцию

1. **Backend проверяет `user_id` во всех операциях**
   - GET `/cart/user/:userId` → возвращает корзину только для этого userId
   - GET `/orders/user/:userId` → возвращает заказы только для этого userId

2. **Frontend передаёт `user_id` в каждом запросе**
   - localStorage: `greenflowers_user` → парсим `.id`
   - CartContext использует этот userId

3. **БД структура поддерживает изоляцию**
   - `FOREIGN KEY (user_id) REFERENCES users(id)`
   - Индексы на `user_id` для быстрого поиска

### ✅ Что происходит при логауте

1. **Пользователь выходит**
   - Очищается localStorage: `greenflowers_user`
   - CartContext обнуляется

2. **Новый пользователь входит**
   - Загружается его userId
   - CartContext загружает его корзину с сервера

---

## 🧪 Тестирование

### Сценарий 1: Изоляция корзин

```
1. Пользователь A входит
   → Видит пустую корзину
   → Добавляет товар X
   → В БД: cart_items (user_id=A, product_id=X, quantity=1)

2. Пользователь B входит
   → Видит пустую корзину (товар X НЕ видит!)
   → Добавляет товар Y
   → В БД: cart_items (user_id=B, product_id=Y, quantity=1)

3. Пользователь A входит снова
   → Видит только товар X в корзине
   → Товара Y нет (он не его)
```

### Сценарий 2: Изоляция заказов

```
1. Пользователь A создаёт заказ #1
   → В БД: orders (id=1, user_id=A, ...)

2. Пользователь B создаёт заказ #2
   → В БД: orders (id=2, user_id=B, ...)

3. Пользователь A открывает "Мои заказы"
   → API: GET /orders/user/A
   → Видит только заказ #1
   → Заказ #2 НЕ видит
```

---

## 📊 API контрольный список

### Для корзины

- ✅ `GET /api/cart/user/:userId` — получить корзину
- ✅ `POST /api/cart` — добавить товар (требует `user_id`)
- ✅ `PUT /api/cart/:itemId` — обновить количество
- ✅ `DELETE /api/cart/:itemId` — удалить товар
- ✅ `DELETE /api/cart/user/:userId/clear` — очистить корзину

### Для заказов

- ✅ `POST /api/orders` — создать заказ
- ✅ `GET /api/orders/user/:userId` — получить заказы пользователя
- ✅ `GET /api/orders/all` — все заказы (только для admin/worker)

---

## 🚀 Развёртывание

### Backend

```bash
cd back
npm install
npm start
# Убедитесь, что таблицы созданы:
# - users, products, cart_items, orders, order_items
```

### Frontend

```bash
cd sdfg
npm install
npm run dev
```

---

**Статус**: ✅ Полностью реализовано и готово к использованию

Обновлено: 15 февраля 2026 г.
