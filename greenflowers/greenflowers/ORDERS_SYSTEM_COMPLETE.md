## 🎯 Система заказов - Итоговый гайд интеграции

### ✅ Что реализовано:

#### 1. **Добавление в корзину** ✅

- **Главная страница**: Кнопка "+" на каждом товаре(`ProductCard`)
- **Логика**: `CartContext.addToCart()` - добавляет товар в корзину пользователя
- **Хранилище**:
  - Авторизованные пользователи: база данных (таблица `cart_items`)
  - Гости: `localStorage` (ключ `temp_cart`)

**Файлы:**

- `sdfg/contexts/cart-context.tsx` - управление корзиной
- `sdfg/components/store/product-card.tsx` - кнопка добавления

---

#### 2. **Оформление заказа** ✅

- **Путь**: `/cart` → нажать "Оформить заказ" → модальное окно
- **Компонент**: `OrderModal` в `/components/checkout/order-modal.tsx`
- **Процесс**:
  1. Проверка авторизации пользователя
  2. Сбор данных: `user_id`, `cart items`, `delivery info`
  3. POST запрос к `POST /api/orders`
  4. Сохранение заказа в БД с `user_id`
  5. Очистка корзины после успеха
  6. Редирект на страницу подтверждения

**Файлы:**

- `sdfg/app/cart/page.tsx` - страница корзины
- `sdfg/components/checkout/order-modal.tsx` - модалькно оформления

---

#### 3. **Сохранение в БД** ✅

- **Таблица**: `orders` с полями:
  - `id` - первичный ключ
  - `user_id` - ID пользователя (связь с таблицей users)
  - `status` - статус заказа (pending, processing, shipped, delivered, etc.)
  - `total_amount` - сумма заказа
  - `delivery_city`, `delivery_address` - адрес доставки
  - `created_at`, `updated_at` - временные метки

- **Таблица**: `order_items` - позиции заказа
  - `order_id` - связь с заказом
  - `product_id` - товар
  - `quantity`, `unit_price` - количество и цена

**Backend:**

- `back/routes/orders.js` - маршруты для заказов

---

#### 4. **Отображение у пользователя** ✅

- **URL**: `/orders`
- **功能**:
  - Загрузка заказов пользователя по `user_id`
  - Отображение статуса каждого заказа
  - Информация о доставке
    -Real-time обновление статуса (polling каждые 10 сек)

**Файлы:**

- `sdfg/app/orders/page.tsx` - страница заказов пользователя
- `sdfg/hooks/use-orders-polling.ts` - хук для polling обновлений

---

#### 5. **Отображение в админ-панели** ✅

- **URL**: `/admin/orders`
- **Функции**:
  - Таблица со всеми заказами (по всем пользователям)
  - Фильтрация (по статусу, дате, сумме, клиенту)
  - Изменение статуса заказа
  - Real-time обновление статуса (polling каждые 15 сек)

**Файлы:**

- `sdfg/app/admin/orders/page.tsx` - админ-панель заказов
- `sdfg/hooks/use-admin-orders-polling.ts` - хук для polling админа

---

#### 6. **Обновление статуса без перезагрузки** ✅

- **Механизм**: Polling (опрос каждые 10-15 секунд)
- **Процесс**:
  1. Администратор меняет статус заказа в админ-панели
  2. PUT запрос к `/api/orders/{id}/status` обновляет БД
  3. Хук `useOrdersPolling` периодически загружает обновлённый список
  4. При обнаружении изменения - обновляется `state` без перезагрузки
  5. Пользователь видит новый статус в своём профиле

**API эндпоинты:**

- `PUT /api/orders/{orderId}/status` - изменение статуса

**Компоненты:**

- `use-orders-polling.ts` - пользовательский хук
- `use-admin-orders-polling.ts` - админский хук

---

### 📊 Архитектура данных

```sql
-- Таблица пользователей
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  phone VARCHAR(20),
  name VARCHAR(255),
  role VARCHAR(50),
  ...
);

-- Таблица заказов
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),  -- ← ДОРОГА К ЮЗЕРУ
  total_amount DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending',
  delivery_city VARCHAR(255),
  delivery_address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  ...
);

-- Таблица позиций заказа
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER,
  unit_price DECIMAL(10, 2),
  ...
);
```

---

### 🔄 Поток данных

```
1. ДОБАВЛЕНИЕ В КОРЗИНУ
   User нажимает "+" → ProductCard.onAdd()
   → useCart().addToCart(product, quantity)
   → API call POST /api/cart/add (если залогинен)
   → CartContext.cart обновляется
   → Badge в Header обновляется (без перезагрузки)

2. ОФОРМЛЕНИЕ ЗАКАЗА
   Пользователь нажимает "Оформить" → OrderModal opens
   → Заполняет форму с адресом доставки
   → Нажимает "Подтвердить"
   → OrderModal вызывает API POST /api/orders
   → Backend: сохраняет заказ в БД с user_id
   → Frontend: clearCart(), редирект на /orders

3. ПРОСМОТР ЗАКАЗОВ (Пользователь)
   /orders → loadOrders(user.id)
   → api.getUserOrders(userId)
   → Backend: SELECT * FROM orders WHERE user_id = $1
   → Отображение заказов с их статусами
   → useOrdersPolling() → каждые 10 сек проверяет изменения

4. ПРОСМОТР ЗАКАЗОВ (Администратор)
   /admin/orders → loadOrders()
   → api.getAllOrders(userId)
   → Backend: SELECT * FROM orders
   → Отображение всех заказов
   → useAdminOrdersPolling() → каждые 15 сек проверяет изменения

5. ИЗМЕНЕНИЕ СТАТУСА
   Admin выбирает статус в dropdown
   → handleStatusChange(orderId, newStatus)
   → API PUT /api/orders/{id}/status
   → Backend: UPDATE orders SET status = $1 WHERE id = $2
   → Frontend: setOrders() с новым статусом (БЕЗ перезагрузки)

6. АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ У ПОЛЬЗОВАТЕЛЯ
   useOrdersPolling() в /orders компоненте
   → Каждые 10 сек: api.getUserOrders(userId)
   → Сравнивает statuses
   → Если изменилось → setOrders() с новыми данными
   → Пользователь видит новый статус БЕЗ перезагрузки
```

---

### 🧪 Проверочный лист

#### Тестирование добавления в корзину:

- [ ] На главной странице видна кнопка "+" на каждом товаре
- [ ] При клике на "+" открывается сообщение "Товар добавлен в корзину"
- [ ] Badge в header обновляется с количеством товаров
- [ ] При перезагрузке товары остаются в корзине (для авторизованных)

#### Тестирование оформления заказа:

- [ ] На странице `/cart` есть кнопка "Оформить заказ"
- [ ] Если не залогинен → редирект на `/auth/login`
- [ ] Если залогинен → открывается модальное окно
- [ ] После подтверждения → заказ сохраняется в БД
- [ ] Корзина очищается после оформления
- [ ] Пользователь видит страницу подтверждения

#### Тестирование отображения у пользователя:

- [ ] На странице `/orders` видны все заказы пользователя
- [ ] Отображается статус каждого заказа
- [ ] Отображается информация о доставке (город, адрес)
- [ ] При изменении статуса админом → статус обновляется БЕЗ перезагрузки

#### Тестирование админ-панели:

- [ ] На странице `/admin/orders` видны ВСЕ заказы
- [ ] Можно изменить статус каказа через dropdown или модаль
- [ ] После изменения статуса → заказ обновляется в списке БЕЗ перезагрузки
- [ ] Фильтры работают правильно (по статусу, дате, сумме)
- [ ] Sorting работает правильно

#### Тестирование real-time обновления:

- [ ] Открыть заказы пользователя в один браузер
- [ ] Открыть админ-панель в другом браузере
- [ ] Изменить статус заказа в админке
- [ ] Проверить, что статус обновится в пользовательском браузере БЕЗ перезагрузки

---

### 🛠️ Техническая деталь: Polling vs WebSocket

**Текущая реализация: Polling** ✅

- Клиент периодически (каждые 10-15 сек) запрашивает обновления
- Простая реализация, не требует WebSocket
- Достаточна для большинства приложений
- Нагрузка на БД: низкую (один запрос на пользователя каждые 10 сек)

**Почему polling а не WebSocket?**

- Polling: простой, хорошо работает за NAT/proxy, кросс-браузерный
- WebSocket: требует отдельного подключения, сложнее в развёртывании

---

### 📝 Использованные API методы

```typescript
// Корзина
api.getCart(userId);
api.addToCart(userId, product_id, quantity);
api.removeFromCart(itemId, userId);
api.updateCartItem(itemId, userId, quantity);
api.clearCart(userId);

// Заказы
api.createOrder(orderData); // POST /api/orders
api.getUserOrders(userId); // GET /api/orders/user/:userId
api.getAllOrders(userId); // GET /api/orders/all
api.updateOrderStatus(userId, orderId, status); // PUT /api/orders/:id/status
api.deleteOrders(orderIds, userId); // DELETE /api/orders
```

---

### 🚀 Как запустить и протестировать

1. **Запустить backend:**

   ```bash
   cd back
   npm start
   ```

2. **Запустить frontend:**

   ```bash
   cd sdfg
   npm run dev
   ```

3. **Открыть в браузере:**
   - Главная страница: `http://localhost:3001`
   - Корзина: `http://localhost:3001/cart`
   - Заказы пользователя: `http://localhost:3001/orders`
   - Админ-панель: `http://localhost:3001/admin/orders`

4. **Действия для тестирования:**
   - Добавить товар в корзину ("+" кнопка)
   - Оформить заказ (кнопка в корзине)
   - Посмотреть заказы в `/orders`
   - Изменить статус заказа в админке
   - Убедиться, что статус обновляется в `/orders` БЕЗ перезагрузки

---

### ⚠️ Важные замечания

1. **user_id обязателен**: Все заказы связаны с `user_id`. Убедитесь, что пользователь авторизован перед оформлением заказа.

2. **Статусы заказов**: Backend поддерживает следующие статусы:
   - `pending` - завершён
   - `processing` - в обработке
   - `confirmed` - подтверждён
   - `shipped` - отправлен
   - `in_transit` - в пути
   - `delivered` - доставлен
   - `cancelled` - отменён

3. **Полинг**: По умолчанию:
   - Пользовательские заказы: опрос каждые 10 сек
   - Админ-панель: опрос каждые 15 сек
   - Первый опрос через 5 сек после монтирования

4. **Производительность**: Если много заказов, можно увеличить интервал полинга или добавить пагинацию.

---

### 📦 Файлы которые были изменены/добавлены

**Новые файлы:**

- `sdfg/hooks/use-orders-polling.ts` - хук для polling заказов пользователя
- `sdfg/hooks/use-admin-orders-polling.ts` - хук для polling админ-панели

**Изменённые файлы:**

- `sdfg/app/orders/page.tsx` - добавлен import и использование `useOrdersPolling`
- `sdfg/app/admin/orders/page.tsx` - добавлен import и использование `useAdminOrdersPolling`
- `sdfg/components/store/product-card.tsx` - исправлена высота и упаковка

**Существующие файлы (не требуют изменений):**

- `sdfg/contexts/cart-context.tsx` ✅
- `sdfg/app/cart/page.tsx` ✅
- `sdfg/components/checkout/order-modal.tsx` ✅
- `back/routes/orders.js` ✅
- `sdfg/lib/api-client.ts` ✅

---

### 🎯 Результат

После реализации этого решения:

1. ✅ Пользователи могут добавлять товары в корзину
2. ✅ Пользователи могут оформлять заказы
3. ✅ Заказы сохраняются в БД с user_id
4. ✅ Заказы отображаются в профиле пользователя
5. ✅ Админ может видеть все заказы
6. ✅ Админ может изменять статус заказов
7. ✅ Пользователь видит обновление статуса БЕЗ перезагрузки страницы
8. ✅ Всё работает синхронно через одну таблицу orders

**Система готова к работе! 🚀**
