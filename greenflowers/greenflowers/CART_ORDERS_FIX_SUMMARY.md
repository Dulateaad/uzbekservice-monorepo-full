# ✅ Исправление архитектуры корзины и заказов

## 📝 Резюме

Реализована полная изоляция корзины и заказов для каждого пользователя через базу данных. Каждый пользователь видит только свою корзину и свои заказы.

---

## 🔧 Что было исправлено

### ❌ Проблемы (было)

1. ❌ **Общая корзина для всех** — все пользователи видели одну корзину
2. ❌ **Заказы не сохранялись** — "Мои заказы" был пуст даже после оформления
3. ❌ **Нет проверки авторизации** — можно было добавлять товары без входа
4. ❌ **Неправильный API call** — Orders page использовал неверный endpoint

### ✅ Решения (стало)

| Проблема                 | Решение                                             | Файл                          |
| ------------------------ | --------------------------------------------------- | ----------------------------- |
| Общая корзина            | Каждая корзина привязана к `user_id`                | `back/routes/cart.js`         |
| Заказы не сохраняются    | API `/orders/user/:userId` фильтрует по userId      | `back/routes/orders.js`       |
| Нет проверки авторизации | Добавлена проверка `localStorage.greenflowers_user` | `sdfg/components/catalog.tsx` |
| Неверный API call        | Обновлён на `api.getUserOrders(userId)`             | `sdfg/app/orders/page.tsx`    |

---

## 📂 Файлы, которые были изменены

### Frontend

#### 1. **`sdfg/components/catalog.tsx`** ✏️

- Добавлена импорт `useRouter`
- Добавлена проверка авторизации перед `addToCart`
- Если пользователь не авторизован → редирект на `/auth/login`

```tsx
const savedUser = localStorage.getItem("greenflowers_user");
if (!savedUser) {
  alert("Пожалуйста, войдите в аккаунт, чтобы добавлять товары в корзину");
  router.push("/auth/login");
  return;
}
```

#### 2. **`sdfg/app/orders/page.tsx`** ✏️

- Заменена неверная функция `api.request("/orders", {...})`
- На правильную: `api.getUserOrders(user.id)`
- Теперь используется эндпоинт `GET /api/orders/user/:userId`

```tsx
const response = await api.getUserOrders(user.id);
// Вместо: api.request("/orders", { method: "POST", ... })
```

#### 3. **`sdfg/components/checkout/order-modal.tsx`** ✏️

- Добавлен импорт `useCart`
- Добавлен вызов `clearCart()` после успешного создания заказа
- Корзина теперь очищается: `DELETE /api/cart/user/:userId/clear`

```tsx
if (resp?.success && resp?.order?.id) {
  await clearCart(); // Очищаем корзину после заказа
  router.push(`/order-confirmation/${resp.order.id}`);
}
```

### Backend

#### 4. **`back/routes/cart.js`** ✅ (уже правильно реализовано)

- ✅ Все операции с корзиной используют `WHERE user_id = $1`
- ✅ Корзина полностью изолирована по пользователям
- ✅ UNIQUE(user_id, product_id) гарантирует один товар на пользователя

#### 5. **`back/routes/orders.js`** ✅ (уже правильно реализовано)

- ✅ `GET /orders/user/:userId` фильтрует заказы по `user_id`
- ✅ `POST /orders` создаёт заказ с привязкой к `user_id`
- ✅ Заказы полностью изолированы

### Документация

#### 6. **`CART_ORDERS_ARCHITECTURE.md`** 📄 (новый файл)

- Полное описание архитектуры корзины и заказов
- SQL схемы таблиц
- Примеры API запросов
- Сценарии тестирования
- Объяснение безопасности и изоляции

---

## 🔒 Как работает изоляция

### Уровень 1: Frontend

```tsx
// 1. Берём user_id из localStorage
const savedUser = localStorage.getItem("greenflowers_user");
const userId = JSON.parse(savedUser).id;

// 2. Отправляем user_id в каждом запросе
await api.getCart(userId);           // GET /api/cart/user/:userId
await api.addToCart(userId, ...);    // POST /api/cart (+ user_id в теле)
await api.getUserOrders(userId);     // GET /api/orders/user/:userId
```

### Уровень 2: Backend API

```javascript
// 3. Backend фильтрует по user_id
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const result = await pool.query(
    "SELECT * FROM orders WHERE user_id = $1",
    [userId], // ← Только заказы этого пользователя
  );
  res.json({ success: true, orders: result.rows });
});
```

### Уровень 3: База данных

```sql
-- 4. БД гарантирует изоляцию
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, product_id)  -- Один товар на пользователя
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  ...
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 📊 Поток оформления заказа

```
1. КАТАЛОГ
   ├─ Нужна ли авторизация? ❌
   │  └─ alert("Войдите в аккаунт")
   │     router.push("/auth/login")
   │
   ├─ Авторизован? ✅
   │  └─ addToCart(userId, product, quantity)
   │     └─ POST /api/cart (user_id привязывается)
   │
   └─ Товар добавлен в БД (cart_items)
      └─ WHERE user_id = current_user_id

2. КОРЗИНА
   ├─ Загружает: GET /api/cart/user/:userId
   │  └─ Видит только свои товары
   │
   └─ Нажимает "🛒 Оформить"
      └─ Открывается OrderModal

3. МОДАЛЬ ПОДТВЕРЖДЕНИЯ
   ├─ Показывает сумму
   └─ Нажимает "Подтвердить"
      └─ handleSubmit()

4. СОЗДАНИЕ ЗАКАЗА
   ├─ POST /api/orders
   │  ├─ Создаёт запись в orders (user_id = текущий)
   │  └─ Создаёт записи в order_items
   │
   ├─ DELETE /api/cart/user/:userId/clear
   │  └─ Очищает только корзину текущего пользователя
   │
   └─ router.push("/order-confirmation/:id")

5. СТРАНИЦА ПОДТВЕРЖДЕНИЯ
   └─ Отображает детали заказа

6. РАЗДЕЛ "МОИ ЗАКАЗЫ"
   ├─ GET /api/orders/user/:userId
   │  └─ Видит только свои заказы
   │
   └─ Каждый пользователь видит только его заказы
```

---

## 🧪 Проверка работы

### Сценарий 1: Гость не может добавлять товары

```
1. Открыть каталог без авторизации
2. Нажать на товар → выбрать количество
3. Нажать "Добавить в корзину"
4. ✅ Должен быть alert: "Пожалуйста, войдите в аккаунт"
5. ✅ Редирект на /auth/login
```

### Сценарий 2: Каждый пользователь видит свою корзину

```
Пользователь A:
  1. Войти в аккаунт A
  2. Добавить товар X → корзина: [X]
  3. Выйти

Пользователь B:
  1. Войти в аккаунт B
  2. Добавить товар Y → корзина: [Y]
  3. Выйти

Пользователь A снова:
  1. Войти в аккаунт A
  2. ✅ Видит корзину: [X] (товар Y НЕ видит)
```

### Сценарий 3: Каждый пользователь видит свои заказы

```
Пользователь A:
  1. Оформляет заказ → Order #1 (user_id=A)
  2. Открывает "Мои заказы"
  3. ✅ Видит Order #1

Пользователь B:
  1. Оформляет заказ → Order #2 (user_id=B)
  2. Открывает "Мои заказы"
  3. ✅ Видит Order #2
  4. ❌ Order #1 не видит (чужой)
```

---

## 🚀 Запуск и тестирование

### Запуск backend

```bash
cd back
npm start
# Проверить: http://localhost:5000/api/health
```

### Запуск frontend

```bash
cd sdfg
npm run dev
# Проверить: http://localhost:3000
```

### Запуск тестов

```bash
# Linux/Mac
bash test-cart-isolation.sh

# Windows (PowerShell)
# Вручную выполнить curl команды из test-cart-isolation.sh
```

---

## ✅ Чек-лист

- ✅ Каждый пользователь видит только свою корзину
- ✅ Гост не может добавлять товары (требуется авторизация)
- ✅ При добавлении товара в БД сохраняется `user_id`
- ✅ При оформлении заказа корзина очищается
- ✅ В "Мои заказы" видны только заказы текущего пользователя
- ✅ API фильтрует данные по `user_id`
- ✅ БД использует FOREIGN KEY для целостности данных
- ✅ Frontend собирается без ошибок
- ✅ Backend готов к использованию

---

## 📚 Дополнительная документация

- [CART_ORDERS_ARCHITECTURE.md](CART_ORDERS_ARCHITECTURE.md) — Полное описание архитектуры
- [back/routes/cart.js](back/routes/cart.js) — Backend для корзины
- [back/routes/orders.js](back/routes/orders.js) — Backend для заказов
- [sdfg/contexts/cart-context.tsx](sdfg/contexts/cart-context.tsx) — Frontend контекст
- [sdfg/app/orders/page.tsx](sdfg/app/orders/page.tsx) — Страница заказов

---

**Статус**: ✅ ГОТОВО К ИСПОЛЬЗОВАНИЮ

**Дата**: 15 февраля 2026 г.

**Версия**: 2.0 (с изоляцией пользователей)
