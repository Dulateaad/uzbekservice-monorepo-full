"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/cart-context";
import { api } from "@/lib/api-client";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: any[];
  cartTotal: number;
  userData: {
    id: number;
    email?: string;
    phone?: string;
    city?: string;
    name?: string;
  } | null;
  city: string;
}

export function OrderModal({
  isOpen,
  onClose,
  cartItems,
  cartTotal,
  userData,
  city,
}: OrderModalProps) {
  const router = useRouter();
  const { clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ orderId: string; total: number } | null>(null);

  const handleSubmit = async () => {
    if (!userData?.id) {
      alert("Пользователь не найден. Повторите вход.");
      router.push("/auth/login");
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      alert("Корзина пуста. Добавьте товары.");
      return;
    }

    if (!cartTotal || cartTotal <= 0) {
      alert("Сумма заказа некорректна.");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderItems = cartItems
        .map((item: any) => {
          const productId = item.product_id ?? item.id;
          const qty = item.quantity || 0;
          const price =
            (item.unit_price ?? item.price) || item.price_per_unit || 0;

          if (!productId || !qty || !price) {
            throw new Error(
              `Товар не полностью заполнен (ID: ${productId}, кол-во: ${qty}, цена: ${price})`,
            );
          }

          return {
            product_id: productId,
            quantity: qty,
            unit_price: Number(price),
            truck_id: item.truck_id || null,
            product_name: String(item.name ?? "").trim() || undefined,
            variety: String(item.variety ?? "").trim() || undefined,
            firestore_doc_id: item.firestore_doc_id ?? undefined,
            line_kind: item.line_kind ?? undefined,
          };
        })
        .filter((item) => item.product_id && item.quantity > 0);

      if (orderItems.length === 0) {
        alert("Нет корректных товаров в заказе.");
        return;
      }

      const orderData = {
        user_id: userData.id,
        customer_name: userData.name || "Клиент",
        customer_phone: userData.phone || "+7",
        customer_email: userData.email || "noemail@example.com",
        total_amount: Math.round(cartTotal * 100) / 100,
        delivery_city: city || "Не указан",
        delivery_address: "Уточнить адрес",
        delivery_date: new Date(
          new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        delivery_time: null,
        payment_method: "cash",
        payment_status: "pending",
        notes: "",
        status: "pending",
        items: orderItems,
      };

      const resp = await api.createOrder(orderData);

      if (resp?.success && resp?.order?.id) {
        await clearCart();
        setSuccess({
          orderId: String(resp.order.order_number || resp.order.id).slice(-8),
          total: cartTotal,
        });
      } else {
        console.warn("Order create failed", resp);
        alert(resp?.error || "Не удалось создать заказ");
      }
    } catch (error) {
      console.error("Order creation error:", error);
      alert(
        error instanceof Error ? error.message : "Ошибка при создании заказа",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    setSuccess(null);
    onClose();
    router.push("/client/orders");
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-sm w-full">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#568a56]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Заказ оформлен!
            </h2>
            <p className="text-gray-600 mb-1">
              Номер: <span className="font-semibold text-[#568a56]">#{success.orderId}</span>
            </p>
            <p className="text-gray-600 mb-2">
              Сумма:{" "}
              <span className="font-bold text-[#568a56]">
                {success.total.toLocaleString("ru-RU", {
                  style: "currency",
                  currency: "KZT",
                })}
              </span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Менеджер свяжется с вами в WhatsApp для подтверждения.
            </p>
            <button
              type="button"
              onClick={handleDone}
              className="w-full py-3 bg-[#568a56] text-white rounded-lg font-semibold hover:bg-[#457245] transition"
            >
              Мои заказы
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-sm w-full">
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Оформить заказ?
          </h2>
          <p className="text-gray-600 mb-6">
            Сумма к оплате:{" "}
            <span className="block text-3xl font-bold text-[#568a56] mt-2">
              {cartTotal.toLocaleString("ru-RU", {
                style: "currency",
                currency: "KZT",
              })}
            </span>
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#568a56] text-white rounded-lg font-semibold hover:bg-[#457245] transition disabled:opacity-50"
            >
              {isSubmitting ? "..." : "Подтвердить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
