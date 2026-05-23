"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  image_url?: string;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  city: string;
  delivery_date: string;
  created_at: string;
  items: OrderItem[];
  notes?: string;
}

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.request(`/orders/${orderId}`, {
        method: "GET",
      });

      if (
        response &&
        typeof response === "object" &&
        "success" in response &&
        response.success === false
      ) {
        setError(
          (response as { error?: string }).error || "Заказ недоступен",
        );
        setOrder(null);
        return;
      }

      const r = response as Order & { status_retail?: Order["status"] };
      setOrder({
        ...r,
        status: (r.status_retail ?? r.status) as Order["status"],
      });
      setError(null);
    } catch (err) {
      setError("Не удалось загрузить детали заказа");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    const uidOk =
      user != null && (Boolean(user.firebaseUid) || user.id != null);
    if (!uidOk || !orderId) {
      setError(!uidOk ? "Требуется авторизация" : null);
      setLoading(false);
      return;
    }

    loadOrderDetails();
  }, [orderId, user, authLoading]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> =
      {
        processing: {
          bg: "bg-yellow-100",
          text: "text-yellow-800",
          label: "🟡 В обработке",
        },
        shipped: {
          bg: "bg-blue-100",
          text: "text-blue-800",
          label: "🔵 Отправлен",
        },
        delivered: {
          bg: "bg-green-100",
          text: "text-green-800",
          label: "🟢 Доставлен",
        },
        cancelled: {
          bg: "bg-red-100",
          text: "text-red-800",
          label: "🔴 Отменён",
        },
      };

    const badge = badges[status] || badges.processing;
    return (
      <span
        className={`inline-block px-4 py-2 rounded-lg text-sm font-bold ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("ru-RU", {
      style: "currency",
      currency: "KZT",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6 pb-24 px-4 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-[#2f6f4a] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6 pb-24 px-4">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-gray-600 mb-4">Требуется авторизация</p>
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-[#2f6f4a] text-white rounded-lg font-semibold"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg p-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3 mt-6">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-semibold mb-4">{error}</p>
            <button
              onClick={() => router.push("/orders")}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Вернуться к заказам
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-24">
      {/* Верхняя панель */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Заказ #{order.order_number}
          </h1>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-4">
        {/* Статус и дата */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex justify-between items-start gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Статус заказа</p>
              {getStatusBadge(order.status)}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Дата заказа</p>
              <p className="font-semibold">{formatDate(order.created_at)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">Город доставки</p>
              <p className="font-semibold text-lg mt-1">📍 {order.city}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Дата поставки</p>
              <p className="font-semibold text-lg mt-1">
                {new Date(order.delivery_date).toLocaleDateString("ru-RU")}
              </p>
            </div>
          </div>
        </div>

        {/* Товары */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Товары</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center pb-3 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {item.product_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Количество: {item.quantity} шт.
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#2f6f4a]">
                    {formatAmount(item.price * item.quantity)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatAmount(item.price)} шт.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Итоговая сумма */}
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <div className="flex justify-between items-center">
            <p className="text-lg font-semibold text-gray-900">
              Итоговая сумма:
            </p>
            <p className="text-3xl font-bold text-[#2f6f4a]">
              {formatAmount(order.total_amount)}
            </p>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex gap-3">
          <Link
            href="/orders"
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition text-center"
          >
            К заказам
          </Link>
          <a
            href="https://wa.me/77082354533?text=Вопрос по заказу"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-3 bg-[#2f6f4a] text-white rounded-lg font-semibold hover:bg-[#1f5a3a] transition text-center"
          >
            Написать в WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
