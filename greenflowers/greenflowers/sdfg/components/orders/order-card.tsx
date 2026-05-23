"use client";

import React from "react";
import Link from "next/link";

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  city: string;
  delivery_date: string;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { emoji: string; label: string }> = {
      processing: { emoji: "🟡", label: "В обработке" },
      shipped: { emoji: "🔵", label: "Отправлен" },
      delivered: { emoji: "🟢", label: "Доставлен" },
      cancelled: { emoji: "🔴", label: "Отменён" },
    };

    const badge = badges[status] || badges.processing;
    return `${badge.emoji} ${badge.label}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("ru-RU", {
      style: "currency",
      currency: "KZT",
    });
  };

  return (
    <div className="px-4 py-4 hover:bg-gray-100 transition">
      {/* Первая строка: номер и статус */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg text-gray-900">
          #{order.order_number}
        </h3>
        <span className="text-sm font-semibold text-gray-700">
          {getStatusBadge(order.status)}
        </span>
      </div>

      {/* Вторая строка: город */}
      <p className="text-gray-600 text-sm mb-1">📍 {order.city}</p>

      {/* Третья строка: дата */}
      <p className="text-gray-600 text-sm mb-3">
        Дата поставки: {formatDate(order.delivery_date)}
      </p>

      {/* Четвёртая строка: сумма */}
      <p className="text-2xl font-bold text-[#2f6f4a] mb-4">
        {formatAmount(order.total_amount)}
      </p>

      {/* Кнопки */}
      <div className="flex gap-3">
        <Link
          href={`/orders/${order.id}`}
          className="px-4 py-2 bg-[#568a56] text-white rounded font-semibold hover:bg-[#457245] transition text-sm"
        >
          Подробнее
        </Link>
        {order.status === "delivered" && (
          <button className="px-4 py-2 border-2 border-[#568a56] text-[#568a56] rounded font-semibold hover:bg-green-50 transition text-sm">
            Повторить
          </button>
        )}
      </div>
    </div>
  );
}
