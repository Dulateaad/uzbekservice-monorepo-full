# 🛒 Примеры кода для работы с корзиной

## 1. Базовый компонент товара с кнопкой "+"

```typescript
// components/product-item.tsx
"use client";

import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: number;
  name: string;
  price_per_box: number;
  image_url: string;
  description: string;
}

export function ProductItem({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      alert("Пожалуйста, войдите в аккаунт, чтобы добавить товар в корзину");
      router.push("/auth/login");
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(product, 1);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      alert("Ошибка при добавлении в корзину");
      console.error(error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition">
      <img
        src={product.image_url}
        alt={product.name}
        className="w-full h-48 object-cover rounded-lg mb-4"
      />

      <h3 className="font-bold text-lg mb-2">{product.name}</h3>
      <p className="text-gray-600 text-sm mb-3">{product.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-green-600">
          {product.price_per_box} KZT
        </span>

        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            showSuccess
              ? "bg-green-500 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {showSuccess ? "✓ Добавлено" : isAdding ? "..." : "+"}
        </button>
      </div>
    </div>
  );
}
```

---

## 2. Badge с количеством товаров в шапке

```typescript
// components/cart-badge.tsx
"use client";

import { useCart } from "@/contexts/cart-context";
import Link from "next/link";

export function CartBadge() {
  const { getCartCount } = useCart();
  const count = getCartCount();

  return (
    <Link href="/cart" className="relative">
      <button className="p-2 hover:bg-gray-100 rounded-lg transition">
        {/* Shopping Cart Icon */}
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>

        {/* Badge */}
        {count > 0 && (
          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-5">
            {count}
          </span>
        )}
      </button>
    </Link>
  );
}
```

---

## 3. Страница корзины (полная)

```typescript
// app/cart/page.tsx
"use client";

import { useCart } from "@/contexts/cart-context";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, getCartTotal } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      alert("Пожалуйста, войдите в аккаунт для оформления заказа");
      router.push("/auth/login");
      return;
    }
    router.push("/checkout");
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Ваша корзина пуста</h1>
          <p className="text-gray-600 mb-8">
            Добавьте товары из каталога
          </p>
          <Link
            href="/#catalog"
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold"
          >
            Перейти в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Моя корзина</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 border-b pb-4 last:border-b-0"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}

              <div className="flex-1">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-gray-600">
                  {item.price_per_box || item.price_per_unit} KZT за шт.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateQuantity(item.id, Math.max(1, item.quantity - 1))
                  }
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  −
                </button>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateQuantity(item.id, parseInt(e.target.value) || 1)
                  }
                  className="w-12 text-center border rounded"
                />
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  +
                </button>
              </div>

              <div className="text-right">
                <p className="font-bold text-lg">
                  {((item.price_per_box || item.price_per_unit) * item.quantity).toLocaleString()} KZT
                </p>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-600 hover:text-red-700 text-sm mt-2"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4 text-lg">
            <span>Сумма товаров:</span>
            <span>{getCartTotal().toLocaleString()} KZT</span>
          </div>
          <div className="flex justify-between items-center mb-4 text-lg">
            <span>Доставка:</span>
            <span className="text-green-600">Бесплатная</span>
          </div>
          <div className="border-t pt-4 flex justify-between items-center text-2xl font-bold">
            <span>Итого:</span>
            <span className="text-green-600">{getCartTotal().toLocaleString()} KZT</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleCheckout}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg"
          >
            Оформить заказ
          </button>
          <button
            onClick={() => {
              if (window.confirm("Вы уверены, что хотите очистить корзину?")) {
                clearCart();
              }
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg"
          >
            Очистить корзину
          </button>
        </div>

        {/* Back to catalog */}
        <div className="mt-4">
          <Link
            href="/#catalog"
            className="text-green-600 hover:underline"
          >
            ← Вернуться в каталог
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Пользовательский Hook для корзины

```typescript
// hooks/use-cart-management.ts
"use client";

import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useCartManagement() {
  const { addToCart, removeFromCart, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addProductToCart = async (product: any, quantity: number = 1) => {
    setError(null);
    setLoading(true);

    try {
      if (!isAuthenticated) {
        throw new Error("Пожалуйста, войдите в аккаунт");
      }

      await addToCart(product, quantity);
      return { success: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ошибка при добавлении";
      setError(message);

      if (message.includes("войдите")) {
        router.push("/auth/login");
      }

      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    addProductToCart,
    removeFromCart,
    updateQuantity,
    error,
    loading,
    setError,
  };
}
```

---

## 5. Modal для быстрого добавления в корзину

```typescript
// components/quick-add-modal.tsx
"use client";

import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface QuickAddModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddModal({ product, isOpen, onClose }: QuickAddModalProps) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!isAuthenticated) {
      alert("Пожалуйста, войдите в аккаунт");
      router.push("/auth/login");
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(product, quantity);
      alert("Товар добавлен в корзину!");
      onClose();
    } catch (error) {
      alert("Ошибка при добавлении");
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{product.name}</h2>

        <div className="flex items-center gap-4 mb-6">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-32 h-32 object-cover rounded-lg"
            />
          )}
          <div>
            <p className="text-gray-600 mb-2">{product.description}</p>
            <p className="text-2xl font-bold text-green-600">
              {product.price_per_box} KZT
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Количество:</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-2 bg-gray-200 rounded"
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-center border rounded"
            />
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="px-3 py-2 bg-gray-200 rounded"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg disabled:opacity-50"
          >
            {isAdding ? "Добавление..." : "Добавить в корзину"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Использование примеров

```typescript
// pages/catalog.tsx
import { ProductItem } from "@/components/product-item";
import { QuickAddModal } from "@/components/quick-add-modal";
import { useState } from "react";

export default function CatalogPage() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products] = useState([
    {
      id: 1,
      name: "Rose Red",
      price_per_box: 5000,
      image_url: "https://...",
      description: "Красные розы высокого качества",
    },
    {
      id: 2,
      name: "Tulip Yellow",
      price_per_box: 3500,
      image_url: "https://...",
      description: "Жёлтые тюльпаны свежие",
    },
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
      {products.map((product) => (
        <div
          key={product.id}
          onClick={() => setSelectedProduct(product)}
        >
          <ProductItem product={product} />
        </div>
      ))}

      {selectedProduct && (
        <QuickAddModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
```

---

## 7. Интеграция в Header

```typescript
// components/header.tsx
import { CartBadge } from "./cart-badge";

export function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Greenflowers</h1>

        <nav className="flex items-center gap-8">
          <a href="#catalog" className="hover:text-green-600">Каталог</a>
          <a href="#about" className="hover:text-green-600">О нас</a>
          <a href="#contact" className="hover:text-green-600">Контакты</a>
        </nav>

        <CartBadge />
      </div>
    </header>
  );
}
```

---

**Версия:** 1.0  
**Дата:** 14.02.2026  
**Готово к использованию:** ✅
