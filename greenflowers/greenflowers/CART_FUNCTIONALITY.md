# 🛒 Функционал корзины - Полная документация

## 📋 Содержание

1. [Обзор](#обзор)
2. [Архитектура](#архитектура)
3. [Компоненты](#компоненты)
4. [Использование](#использование)
5. [API](#api)
6. [Примеры](#примеры)

---

## 🎯 Обзор

Полноценный функционал корзины для интернет-магазина с поддержкой:

- ✅ Добавление товаров в корзину
- ✅ Badge с количеством товаров в шапке
- ✅ Привязка корзины к аккаунту пользователя
- ✅ Проверка авторизации
- ✅ Восстановление корзины при входе
- ✅ Раздел "Мои заказы"
- ✅ Context API для управления состоянием
- ✅ Real-time обновление UI без перезагрузки

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────┐
│         Header                      │
│  ├─ Иконка корзины                  │
│  └─ Badge (кол-во товаров)          │
└────────────┬────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│      CartContext (Provider)          │
│  ├─ cart: CartItem[]                 │
│  ├─ addToCart()                      │
│  ├─ removeFromCart()                 │
│  ├─ updateQuantity()                 │
│  ├─ clearCart()                      │
│  ├─ getCartCount()                   │
│  └─ getCartTotal()                   │
└──────────────────────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
 ┌─────────┐   ┌──────────┐
 │Catalog  │   │Cart Page │
 │ - Items │   │ - List   │
 │ - + btn │   │ - Totals │
 └─────────┘   │ - Checkout
               └──────────┘
```

---

## 🧩 Компоненты

### 1️⃣ CartContext (`contexts/cart-context.tsx`)

**Интерфейсы:**

```typescript
interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  name?: string;
  price_per_unit?: number;
  price_per_box?: number;
  color?: string;
  variety?: string;
  stem_length?: string;
  packaging_type?: string;
  image_url?: string;
  min_order_quantity?: number;
}

interface CartContextType {
  cart: CartItem[];
  loading: boolean;
  addToCart: (product: any, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getCartCount: () => number;
  loadCart: () => Promise<void>;
}
```

**Методы:**

```typescript
// Добавить товар в корзину
addToCart(product, quantity): Promise<void>
// Удалить товар из корзины
removeFromCart(itemId): Promise<void>
// Обновить количество товара
updateQuantity(itemId, quantity): Promise<void>
// Очистить корзину
clearCart(): Promise<void>
// Получить общее количество товаров
getCartCount(): number
// Получить итоговую стоимость
getCartTotal(): number
```

---

### 2️⃣ Header (`components/header.tsx`)

**Иконка корзины с badge:**

```tsx
<Link href="/cart" className="relative">
  <button className="p-2 hover:bg-gray-100 rounded-lg transition">
    <svg className="w-6 h-6">{/* Shopping cart icon */}</svg>
    {getCartCount() > 0 && (
      <span className="absolute top-0 right-0 px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full">
        {getCartCount()}
      </span>
    )}
  </button>
</Link>
```

**Особенности:**

- Badge обновляется в реальном времени
- Badge скрывается когда корзина пуста
- Клик переходит на страницу `/cart`

---

### 3️⃣ Catalog (`components/catalog.tsx`)

**Кнопка добавления в корзину:**

```tsx
<button
  onClick={() => {
    addToCart(selectedProduct, quantity);
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
      setSelectedProduct(null);
    }, 1500);
  }}
  className="w-full bg-[#568a56] hover:bg-[#457245] text-white py-4 rounded-lg font-semibold"
>
  🛒 Добавить в корзину
</button>
```

**Функциональность:**

- Проверка авторизации через `addToCart`
- Показывает уведомление об успехе
- Обновляет badge в header сразу же

---

### 4️⃣ Cart Page (`app/cart/page.tsx`)

**Функции:**

- Отображение списка товаров в корзине
- Изменение количества товаров
- Удаление товаров
- Расчёт итоговой стоимости
- Кнопка оформления заказа

---

### 5️⃣ Orders Page (`app/orders/page.tsx`)

**Функции:**

- Отображение списка оформленных заказов
- Статус каждого заказа
- Информация о доставке

---

## 📖 Использование

### Использование CartContext в компоненте

```typescript
import { useCart } from "@/contexts/cart-context";

export function MyComponent() {
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartCount,
    getCartTotal
  } = useCart();

  // Добавить товар
  const handleAddProduct = async (product) => {
    try {
      await addToCart(product, 1);
      // Успешно добавлен
    } catch (error) {
      console.error("Не удалось добавить в корзину:", error);
    }
  };

  // Удалить товар
  const handleRemoveProduct = async (itemId) => {
    await removeFromCart(itemId);
  };

  // Обновить количество
  const handleUpdateQuantity = async (itemId, newQuantity) => {
    await updateQuantity(itemId, newQuantity);
  };

  return (
    <div>
      <p>Товаров в корзине: {getCartCount()}</p>
      <p>Итого: {getCartTotal()} KZT</p>
    </div>
  );
}
```

---

## 🔌 API

### POST /api/cart/add

**Добавить товар в корзину**

```typescript
// Запрос
POST /api/cart/add
{
  user_id: 1,
  product_id: 5,
  quantity: 3
}

// Ответ
{
  success: true,
  message: "Товар добавлен в корзину",
  cart: [
    {
      id: 1,
      product_id: 5,
      quantity: 3,
      name: "Rose Red",
      price_per_box: 5000,
      ...
    }
  ]
}
```

### GET /api/cart

**Получить корзину пользователя**

```typescript
// Запрос
GET /api/cart?user_id=1

// Ответ
{
  success: true,
  cart: [
    {
      id: 1,
      product_id: 5,
      quantity: 3,
      name: "Rose Red",
      price_per_box: 5000,
      ...
    }
  ]
}
```

### DELETE /api/cart/item/:id

**Удалить товар из корзины**

```typescript
// Запрос
DELETE /api/cart/item/1

// Ответ
{
  success: true,
  message: "Товар удален из корзины"
}
```

### PUT /api/cart/item/:id

**Обновить количество товара**

```typescript
// Запрос
PUT /api/cart/item/1
{
  quantity: 5
}

// Ответ
{
  success: true,
  message: "Количество обновлено"
}
```

### DELETE /api/cart

**Очистить корзину**

```typescript
// Запрос
DELETE /api/cart?user_id=1

// Ответ
{
  success: true,
  message: "Корзина очищена"
}
```

---

## 💡 Примеры

### Пример 1: Добавление товара из каталога

```typescript
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";

export function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      alert("Пожалуйста, войдите в аккаунт");
      return;
    }

    await addToCart(product, 1);
    alert("Товар добавлен в корзину!");
  };

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>Цена: {product.price_per_box} KZT</p>
      <button
        onClick={handleAddToCart}
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        ➕ Добавить в корзину
      </button>
    </div>
  );
}
```

---

### Пример 2: Отображение корзины

```typescript
import { useCart } from "@/contexts/cart-context";

export function CartPage() {
  const { cart, removeFromCart, updateQuantity, getCartTotal } = useCart();

  return (
    <div>
      <h1>Мая корзина</h1>

      {cart.length === 0 ? (
        <p>Корзина пуста</p>
      ) : (
        <>
          {cart.map((item) => (
            <div key={item.id} className="border p-4">
              <h3>{item.name}</h3>
              <p>Цена: {item.price_per_box} KZT</p>

              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  updateQuantity(item.id, parseInt(e.target.value))
                }
              />

              <button onClick={() => removeFromCart(item.id)}>
                🗑️ Удалить
              </button>
            </div>
          ))}

          <h2>Итого: {getCartTotal()} KZT</h2>
          <button className="bg-blue-500 text-white px-6 py-2 rounded">
            Оформить заказ
          </button>
        </>
      )}
    </div>
  );
}
```

---

### Пример 3: Badge с количеством товаров

```typescript
import { useCart } from "@/contexts/cart-context";
import Link from "next/link";

export function Header() {
  const { getCartCount } = useCart();

  return (
    <header className="bg-white p-4">
      <nav className="flex justify-between items-center">
        <h1>Greenflowers</h1>

        <Link href="/cart" className="relative">
          <button className="text-2xl">🛒</button>
          {getCartCount() > 0 && (
            <span className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
              {getCartCount()}
            </span>
          )}
        </Link>
      </nav>
    </header>
  );
}
```

---

### Пример 4: Обработка ошибок

```typescript
import { useCart } from "@/contexts/cart-context";
import { useState } from "react";

export function AddToCartButton({ product }) {
  const { addToCart } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddToCart = async () => {
    setError(null);
    setLoading(true);

    try {
      await addToCart(product, 1);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("Not authenticated")) {
          setError("Пожалуйста, войдите в аккаунт");
        } else {
          setError("Ошибка при добавлении в корзину");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleAddToCart}
        disabled={loading}
      >
        {loading ? "Добавление..." : "Добавить в корзину"}
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
```

---

## 🔒 Требования безопасности

### Проверка авторизации

Перед добавлением товара в корзину **ВСЕГДА** проверяйте авторизацию:

```typescript
const handleAddToCart = async () => {
  // ❌ Неправильно - нет проверки
  await addToCart(product, 1);

  // ✅ Правильно - с проверкой
  const saved = localStorage.getItem("greenflowers_user");
  if (!saved) {
    alert("Пожалуйста, войдите в аккаунт");
    return;
  }
  await addToCart(product, 1);
};
```

### Валидация на backend

Backend **ВСЕГДА** проверяет:

- Аутентификация пользователя
- Наличие товара в базе данных
- Валидность количества
- Права доступа

---

## 📊 Структура данных

### Товар (Product)

```typescript
interface Product {
  id: number;
  name: string;
  description?: string;
  category: string;
  price: number; // Основная цена
  price_per_unit?: number; // Цена за единицу
  price_per_box?: number; // Цена за коробку
  image_url?: string;
  color?: string;
  variety?: string;
  stem_length?: string;
  packaging_type?: string;
  min_order_quantity?: number;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}
```

### Товар в корзине (CartItem)

```typescript
interface CartItem {
  id: number; // ID записи в корзине
  product_id: number; // ID товара
  user_id?: number; // ID пользователя (для сервера)
  quantity: number; // Количество
  name?: string; // Название товара (cached)
  price_per_unit?: number; // Цена за единицу (cached)
  price_per_box?: number; // Цена за коробку (cached)
  color?: string;
  variety?: string;
  stem_length?: string;
  packaging_type?: string;
  image_url?: string;
  min_order_quantity?: number;
  added_at?: string; // Когда добавлено в корзину
}
```

### Пользователь (User)

```typescript
interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  role: "customer" | "seller" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## 🧪 Тестирование

### Тест: Добавление товара в корзину

```typescript
describe("CartContext", () => {
  it("should add product to cart", async () => {
    const { result } = renderHook(() => useCart());

    const product = { id: 1, name: "Rose", price: 100 };
    await result.current.addToCart(product, 2);

    expect(result.current.getCartCount()).toBe(2);
    expect(result.current.cart[0].quantity).toBe(2);
  });

  it("should update cart total", async () => {
    const { result } = renderHook(() => useCart());

    const product = { id: 1, price_per_box: 5000 };
    await result.current.addToCart(product, 2);

    expect(result.current.getCartTotal()).toBe(10000);
  });

  it("should remove product from cart", async () => {
    const { result } = renderHook(() => useCart());

    const product = { id: 1, name: "Rose", price: 100 };
    await result.current.addToCart(product, 1);
    await result.current.removeFromCart(result.current.cart[0].id);

    expect(result.current.getCartCount()).toBe(0);
  });
});
```

---

## 🚀 Развёртывание

### Development

```bash
npm run dev
```

Откройте `http://localhost:3000`

### Production

```bash
npm run build
NODE_ENV=production npm start
```

---

## 📚 Дополнительные ссылки

- [CHECKOUT_IMPLEMENTATION.md](./CHECKOUT_IMPLEMENTATION.md) - Оформление заказа
- [CHECKOUT_DEBUGGING.md](./CHECKOUT_DEBUGGING.md) - Отладка
- [API документация](./back/API_DOCS.md) - REST API

---

**Версия:** 1.0  
**Дата:** 14.02.2026  
**Статус:** ✅ ГОТОВО К PRODUCTION
