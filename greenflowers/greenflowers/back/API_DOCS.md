# Spray Flowers API Documentation

## База данных: greenflowers_db

### Роли пользователей:

- **user** - обычный пользователь (может заказывать цветы)
- **worker** - работник (может подтверждать заказы, редактировать каталог)
- **admin** - администратор (полный доступ: управление пользователями, ролями, удаление)

---

## 🔐 AUTHENTICATION (Аутентификация)

### POST /api/users/register

Регистрация нового пользователя (автоматически role: "user")

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Иван Петров",
  "phone": "+7 777 123 4567",
  "city": "Алматы",
  "company_name": "Название компании (опционально)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Пользователь успешно зарегистрирован",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Иван Петров",
    "role": "user",
    "city": "Алматы"
  }
}
```

---

### POST /api/users/login

Авторизация

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Успешный вход",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Иван Петров",
    "role": "user",
    "city": "Алматы"
  }
}
```

---

## 👨‍💼 ADMIN ENDPOINTS (Только для администраторов)

### GET /api/users/admin/users?adminId=1

Получить всех пользователей

**Response:**

```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "email": "user@test.kz",
      "name": "Иван Петров",
      "role": "user",
      "city": "Алматы",
      "is_active": true
    }
  ]
}
```

---

### PUT /api/users/admin/users/:userId/role

Изменить роль пользователя

**Body:**

```json
{
  "adminId": 1,
  "newRole": "worker"
}
```

**Доступные роли:** `"user"`, `"worker"`, `"admin"`

**Response:**

```json
{
  "success": true,
  "message": "Роль успешно изменена",
  "user": {
    "id": 2,
    "email": "user@test.kz",
    "name": "Иван Петров",
    "role": "worker"
  }
}
```

---

### DELETE /api/users/admin/users/:userId?adminId=1

Удалить пользователя

**Response:**

```json
{
  "success": true,
  "message": "Пользователь user@test.kz успешно удален"
}
```

---

## 🌸 PRODUCTS (Каталог цветов)

### GET /api/products

Получить все цветы (доступно всем)

**Response:**

```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "Red Roses Premium",
      "category": "roses",
      "color": "red",
      "price_per_unit": 0.85,
      "price_per_box": 45.0,
      "stock_quantity": 500,
      "image_url": "/red-roses.jpg"
    }
  ]
}
```

---

### GET /api/products/:id

Получить один товар по ID

---

### POST /api/products

Добавить новый цветок (admin или worker)

**Body:**

```json
{
  "userId": 1,
  "name": "Красные розы",
  "category": "roses",
  "color": "red",
  "variety": "Red Pearl",
  "description": "Премиум красные розы",
  "price_per_unit": 0.85,
  "price_per_box": 45.0,
  "stock_quantity": 500,
  "min_order_quantity": 50,
  "stem_length": "60cm",
  "packaging_type": "Box of 50",
  "image_url": "/red-roses.jpg",
  "next_delivery_date": "2025-01-15"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Товар успешно добавлен",
  "product": { ... }
}
```

---

### PUT /api/products/:id

Редактировать цветок (admin или worker)

**Body:** (те же поля что и при создании + userId)

---

### DELETE /api/products/:id?adminId=1

Удалить цветок (только admin)

---

## 📦 ORDERS (Заказы)

### POST /api/orders

Создать заказ (user)

**Body:**

```json
{
  "userId": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 100
    },
    {
      "product_id": 2,
      "quantity": 50
    }
  ],
  "delivery_city": "Алматы",
  "delivery_address": "ул. Абая 123",
  "delivery_date": "2025-01-20",
  "payment_method": "kaspi_qr",
  "notes": "Доставить утром"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Заказ успешно создан",
  "order": {
    "id": 1,
    "user_id": 1,
    "total_amount": 132.5,
    "status": "pending",
    "delivery_city": "Алматы"
  }
}
```

---

### GET /api/orders/user/:userId

Получить заказы пользователя

**Response:**

```json
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "total_amount": 132.5,
      "status": "pending",
      "delivery_city": "Алматы",
      "items": [
        {
          "product_id": 1,
          "product_name": "Red Roses Premium",
          "quantity": 100,
          "unit_price": 0.85
        }
      ]
    }
  ]
}
```

---

### GET /api/orders/all?userId=1

Получить все заказы (worker или admin)

**Response:** (список всех заказов с информацией о пользователях)

---

### PUT /api/orders/:orderId/confirm

Подтвердить заказ (worker или admin)

**Body:**

```json
{
  "userId": 1
}
```

**Response:**

```json
{
  "success": true,
  "message": "Заказ успешно подтвержден",
  "order": { ... }
}
```

---

### PUT /api/orders/:orderId/status

Изменить статус заказа (worker или admin)

**Body:**

```json
{
  "userId": 1,
  "status": "in_transit"
}
```

**Доступные статусы:**

- `pending` - ожидает
- `confirmed` - подтвержден
- `in_transit` - в пути
- `delivered` - доставлен
- `cancelled` - отменен

---

## 🔧 Настройка и запуск

### 1. Создайте БД:

```sql
CREATE DATABASE greenflowers_db;
```

### 2. Запустите SQL скрипт:

```bash
psql -U postgres -d greenflowers_db -f database.sql
```

### 3. Настройте .env:

```
DB_PASSWORD=ваш_пароль
```

### 4. Запустите сервер:

```bash
npm run dev
```

Сервер: http://localhost:5000

---

## 📊 Структура прав доступа:

| Функция                | user | worker | admin |
| ---------------------- | ---- | ------ | ----- |
| Регистрация            | ✅   | ✅     | ✅    |
| Просмотр каталога      | ✅   | ✅     | ✅    |
| Создание заказа        | ✅   | ✅     | ✅    |
| Добавление цветов      | ❌   | ✅     | ✅    |
| Редактирование цветов  | ❌   | ✅     | ✅    |
| Подтверждение заказов  | ❌   | ✅     | ✅    |
| Изменение ролей        | ❌   | ❌     | ✅    |
| Удаление пользователей | ❌   | ❌     | ✅    |
| Удаление цветов        | ❌   | ❌     | ✅    |
