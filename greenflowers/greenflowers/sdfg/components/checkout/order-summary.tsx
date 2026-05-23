"use client";

import React from "react";

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price?: number;
  price_per_box?: number;
  price_per_unit?: number;
}

interface OrderSummaryProps {
  items: OrderItem[];
  total: number;
  showSuccess?: boolean;
}

export function OrderSummary({
  items,
  total,
  showSuccess = false,
}: OrderSummaryProps) {
  const getDisplayPrice = (item: OrderItem): number => {
    // same ordering as cart: prefer explicit price (unit_price equivalent),
    // then per-unit, then per-box, then fallback to generic price field.
    return (
      (item as any).unit_price ??
      item.price_per_unit ??
      item.price_per_box ??
      item.price ??
      0
    );
  };

  const formatPrice = (price: number): string => {
    return price.toLocaleString("ru-RU", {
      style: "currency",
      currency: "KZT",
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 items-start">
          <div className="text-2xl">✓</div>
          <div>
            <p className="font-semibold text-green-900">Заказ оформлен!</p>
            <p className="text-sm text-green-700">
              Пожалуйста, заполните данные доставки для завершения
            </p>
          </div>
        </div>
      )}

      <h3 className="text-lg font-bold text-gray-900 mb-4">
        Сводка заказа ({items.length} товаров)
      </h3>

      <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center text-sm pb-2 border-b border-gray-100"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-gray-600">
                {item.quantity} × {formatPrice(getDisplayPrice(item))}
              </p>
            </div>
            <p className="font-semibold text-gray-900">
              {formatPrice(getDisplayPrice(item) * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <p className="text-gray-700 font-semibold">Итого:</p>
          <p className="text-2xl font-bold text-[#2f6f4a]">
            {formatPrice(total)}
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        <p className="font-semibold mb-1">Способ оплаты:</p>
        <p>💳 Наличными при доставке</p>
      </div>
    </div>
  );
}
