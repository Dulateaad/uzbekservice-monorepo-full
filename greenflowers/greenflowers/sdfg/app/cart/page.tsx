"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/cart-context";
import { api } from "@/lib/api-client";
import { useCity } from "@/contexts/city-context";
import { OrderModal } from "@/components/checkout/order-modal";
import { Header } from "@/components/header";

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
  } = useCart();
  const { city } = useCity();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userData, setUserData] = useState<{
    id: number;
    email?: string;
    phone?: string;
    city?: string;
    name?: string;
  } | null>(null);

  // Load user data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("greenflowers_user");
    if (saved) {
      try {
        setUserData(JSON.parse(saved));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    const n = Number(price || 0);
    return n.toLocaleString("ru-RU", {
      style: "currency",
      currency: "KZT",
    });
  };

  const getDisplayPrice = (item: any) => {
    // prefer the actual unit_price stored on the cart item, then fall back to
    // the product's per-unit price, then per-box, then generic price.
    return (
      item.unit_price ??
      item.price_per_unit ??
      item.price_per_box ??
      item.price ??
      0
    );
  };

  const subtotal = getCartTotal
    ? getCartTotal()
    : (cart || []).reduce(
        (sum: number, item: any) =>
          sum + (getDisplayPrice(item) || 0) * (item.quantity || 0),
        0,
      );

  const handleCheckout = async () => {
    // Проверяем, залогинен ли пользователь
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("greenflowers_user")
        : null;
    if (!saved) {
      alert("Пожалуйста, войдите в аккаунт, чтобы оформить заказ");
      router.push("/auth/login");
      return;
    }

    // Открываем модальное окно
    setIsModalOpen(true);
  };

  const handleClearCart = () => {
    if (window.confirm("Вы уверены, что хотите очистить корзину?")) {
      if (clearCart) {
        clearCart();
      } else {
        (cart || []).forEach((item: any) => removeFromCart(item.id));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pb-32">
        {/* Верхняя панель */}
        <div className="bg-white border-b border-gray-200 sticky top-[70px] z-30">
          <div className="px-4 py-4">
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Вернуться назад"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Корзина</h1>
            </div>
          </div>
        </div>

        {/* Основной контент */}
        <div className="w-full">
          {(cart || []).length === 0 ? (
            <div className="text-center py-20 px-4">
              <p className="text-gray-600 text-lg mb-6">Ваша корзина пуста</p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-[#568a56] text-white rounded-lg font-semibold hover:bg-[#457245] transition inline-block"
              >
                Перейти в каталог
              </button>
            </div>
          ) : (
            <>
              {/* Список товаров */}
              <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                {(cart || []).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition flex"
                  >
                    {/* Фото товара */}
                    <div className="w-24 h-24 bg-gray-100 flex-shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#568a56] to-[#2f6f4a] flex items-center justify-center text-white text-sm font-semibold text-center px-2">
                          {String(item && item.name ? item.name : "").slice(
                            0,
                            12,
                          )}
                        </div>
                      )}
                    </div>

                    {/* Информация товара */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">
                          {item.product_missing
                            ? `${item.name} (удален)`
                            : item.name}
                        </h3>
                        {item.product_missing && (
                          <p className="text-xs text-red-600 mt-1">
                            Этот товар был удалён продавцом. Рекомендуется
                            удалить позицию из корзины.
                          </p>
                        )}
                        {item.variety && (
                          <p className="text-xs text-gray-500">
                            {item.variety}
                          </p>
                        )}
                        {(item.batch_date || item.arrival_date) && (
                          <p
                            className="text-xs text-gray-600 mt-2 font-semibold"
                            translate="no"
                          >
                            Партия{" "}
                            {new Date(
                              item.batch_date || item.arrival_date || "",
                            ).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "long",
                            })}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-[#568a56]">
                        {formatPrice(getDisplayPrice(item))}
                      </p>
                    </div>

                    {/* Управление */}
                    <div className="p-4 flex flex-col items-end justify-between">
                      {/* Кнопка удаления */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Удалить товар"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>

                      {/* Управление количеством */}
                      <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          title="Уменьшить"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 12H4"
                            />
                          </svg>
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition"
                          title="Увеличить"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Закреплённая нижняя панель с итогом */}
        {(cart || []).length > 0 && (
          <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 shadow-lg">
            <div className="max-w-4xl mx-auto">
              {/* Сумма итого */}
              <div className="mb-4">
                <p className="text-gray-600 text-sm mb-1">Итого:</p>
                <p className="text-3xl font-bold text-[#568a56]">
                  {formatPrice(subtotal)}
                </p>
              </div>

              {/* Кнопки */}
              <div className="flex gap-3">
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || (cart || []).length === 0}
                  className="flex-1 py-3 bg-[#568a56] text-white rounded-lg font-bold hover:bg-[#457245] transition disabled:opacity-50 text-lg flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {isProcessing ? "Оформление..." : "Оформить заказ"}
                </button>

                <button
                  onClick={handleClearCart}
                  className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  title="Очистить корзину"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно оформления */}
        <OrderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          cartItems={cart || []}
          cartTotal={subtotal}
          userData={userData}
          city={city || ""}
        />
      </div>
    </div>
  );
}
