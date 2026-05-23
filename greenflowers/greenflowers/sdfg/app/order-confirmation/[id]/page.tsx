"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { api } from "@/lib/api-client";
import Link from "next/link";

interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  truck_id?: string | null;
  truck_identifier?: string | null;
  truck_arrival_date?: string | null;
}

export default function OrderConfirmation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { id } = await params;
        const data = await api.getOrder(id);
        if (!cancelled && data && (data.success !== false)) {
          setOrder(data);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (loading)
    return (
      <div>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#568a56] border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Загрузка заказа...</p>
        </div>
      </div>
    );

  if (!order)
    return (
      <div>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-600">Заказ не найден</p>
          <Link
            href="/"
            className="text-[#568a56] hover:underline mt-4 inline-block"
          >
            Вернуться в каталог
          </Link>
        </div>
      </div>
    );

  return (
    <div>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-[#568a56]"
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
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Заказ успешно оформлен!
          </h1>
          <p className="text-gray-600 text-lg">
            Номер заказа:{" "}
            <span className="font-semibold text-[#568a56]">
              #{order.order_number || order.id}
            </span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 text-lg mb-4">
              Данные заказа
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Статус</p>
                <p className="font-medium text-gray-900 capitalize">
                  {order.status === "pending"
                    ? "Ожидает обработки"
                    : order.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Имя</p>
                <p className="font-medium text-gray-900">
                  {order.customer_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">WhatsApp</p>
                <p className="font-medium text-gray-900">
                  {order.customer_phone}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Город доставки</p>
                <p className="font-medium text-gray-900">
                  {order.delivery_city || order.city}
                </p>
              </div>
              {order.delivery_address && (
                <div>
                  <p className="text-sm text-gray-500">Адрес</p>
                  <p className="font-medium text-gray-900">
                    {order.delivery_address}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Дата доставки</p>
                <p className="font-medium text-gray-900">
                  {new Date(order.delivery_date).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Способ оплаты</p>
                <p className="font-medium text-gray-900 capitalize">
                  {order.payment_method?.replace("_", " ")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 text-lg mb-4">
              Товары
            </h2>
            <div className="space-y-3">
              {order.items?.map((item: OrderItem, idx: number) => (
                <div
                  key={idx}
                  className="pb-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      {item.product_name || `Товар #${item.product_id}`} &times;{" "}
                      {item.quantity}
                    </span>
                    <span className="font-medium text-gray-900">
                      {(item.unit_price * item.quantity).toLocaleString()} ₸
                    </span>
                  </div>
                  {item.truck_identifier && (
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Фура:</span>{" "}
                      {item.truck_identifier}
                      {item.truck_arrival_date && (
                        <span className="text-gray-600">
                          {" "}
                          &bull;{" "}
                          {new Date(
                            item.truck_arrival_date,
                          ).toLocaleDateString("ru-RU")}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t-2 border-gray-200 pt-4 mt-4">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Итого:</span>
                <span className="text-[#568a56]">
                  {Number(order.total_amount).toLocaleString()} ₸
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex gap-3">
            <svg
              className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Что дальше?</h3>
              <p className="text-blue-800 text-sm">
                Наш менеджер свяжется с вами в WhatsApp для подтверждения заказа
                и уточнения деталей.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/"
              className="px-8 py-3 bg-[#568a56] text-white rounded-lg font-semibold hover:bg-[#457245] transition-colors"
            >
              Продолжить покупки
            </Link>
            <Link
              href="/client/orders"
              className="px-8 py-3 border-2 border-[#568a56] text-[#568a56] rounded-lg font-semibold hover:bg-[#568a56] hover:text-white transition-colors"
            >
              Мои заказы
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
