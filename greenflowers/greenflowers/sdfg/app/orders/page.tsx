"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { Header } from "@/components/header";
import { useOrdersPolling } from "@/hooks/use-orders-polling";

interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  truck_id?: string | null;
  truck_identifier?: string | null;
  truck_arrival_date?: string | null;
}

interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  delivery_city: string;
  delivery_date: string;
  created_at: string;
  truck_id?: string | null;
  truck_identifier?: string | null;
  truck_arrival_date?: string | null;
  items?: OrderItem[];
}

function hasUserNumericId(
  u: { id?: number } | null,
): u is { id: number } & typeof u {
  return u != null && typeof u.id === "number" && Number.isFinite(u.id);
}

export default function OrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const loadOrders = async () => {
    if (!hasUserNumericId(user)) {
      setError("Требуется авторизация");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.getUserOrders(user.id);
      setOrders(response.orders || []);
      setError(null);
    } catch (err) {
      setError("Не удалось загрузить заказы");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  // Polling для обновления статуса заказов в реальном времени
  useOrdersPolling(
    orders,
    (updatedOrders: any[]) => setOrders(updatedOrders as Order[]),
    hasUserNumericId(user) ? user.id : null,
    true, // enabled
    10000, // poll every 10 seconds
  );

  const handleToggleSelection = (orderId: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedOrders.size === 0) return;

    const confirmMessage = `Вы уверены, что хотите удалить ${selectedOrders.size} заказ(ов)?`;
    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      // Отправляем массив id заказов на удаление с user_id для верификации
      await api.deleteOrders(
        Array.from(selectedOrders),
        hasUserNumericId(user) ? user.id : 0,
      );
      setOrders(orders.filter((o) => !selectedOrders.has(o.id)));
      setSelectedOrders(new Set());
      setIsSelectionMode(false);

      alert("Заказы успешно удалены");
    } catch (err) {
      console.error("Delete orders error:", err);
      alert("Не удалось удалить заказы");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    return Number(price || 0).toLocaleString("ru-RU", {
      style: "currency",
      currency: "KZT",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: "Ожидание",
      processing: "Обработка",
      confirmed: "Подтверждён",
      shipped: "Отправлен",
      delivered: "Доставлен",
      cancelled: "Отменён",
    };
    return statusMap[status?.toLowerCase()] || status;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6 pb-24 px-4 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-[#568a56] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6 pb-24 px-4">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Мои заказы</h1>
          <p className="text-gray-600 mb-8">
            Требуется авторизация для просмотра заказов
          </p>
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-[#568a56] text-white rounded-lg font-semibold hover:bg-[#457245] transition inline-block"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-6 px-4 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Заголовок с кнопками управления */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Мои заказы</h1>

            {orders.length > 0 && (
              <div className="flex gap-2">
                {!isSelectionMode ? (
                  <button
                    onClick={() => setIsSelectionMode(true)}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center gap-2"
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
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                    Выбрать
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedOrders(new Set());
                      }}
                      className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                    >
                      Отмена
                    </button>
                    {selectedOrders.size > 0 && (
                      <button
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
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
                        Удалить ({selectedOrders.size})
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Режим выбора: чекбокс "Выбрать всё" */}
          {isSelectionMode && orders.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedOrders.size === orders.length}
                onChange={handleSelectAll}
                className="w-5 h-5 text-[#568a56] rounded cursor-pointer"
              />
              <label className="flex-1 cursor-pointer font-medium text-gray-900">
                Выбрать всё ({orders.length})
              </label>
            </div>
          )}

          {/* Сообщение об ошибке */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <p className="text-red-700 font-semibold">{error}</p>
              <button
                onClick={loadOrders}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-semibold"
              >
                Повторить
              </button>
            </div>
          )}

          {/* Загрузка */}
          {loading && orders.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-gray-200 animate-pulse rounded-xl"
                ></div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            /* Пустой список */
            <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L4 7m5 4v6m4-6v6M7 7V4a1 1 0 011-1h4a1 1 0 011 1v3m6 0a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V7z"
                />
              </svg>
              <p className="text-gray-600 text-lg mb-6">
                У вас пока нет заказов
              </p>
              <Link
                href="/catalog"
                className="px-6 py-3 bg-[#568a56] text-white rounded-lg font-semibold hover:bg-[#457245] transition inline-block"
              >
                Перейти в каталог
              </Link>
            </div>
          ) : (
            /* Список заказов */
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl border-2 transition cursor-pointer ${
                    isSelectionMode
                      ? selectedOrders.has(order.id)
                        ? "border-[#568a56] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                      : "border-gray-200 hover:shadow-md"
                  }`}
                  onClick={() => {
                    if (isSelectionMode) {
                      handleToggleSelection(order.id);
                    }
                  }}
                >
                  <div className="p-4 flex items-start gap-4">
                    {/* Чекбокс в режиме выбора */}
                    {isSelectionMode && (
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => handleToggleSelection(order.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-[#568a56] rounded mt-1 cursor-pointer"
                      />
                    )}

                    {/* Информация о заказе */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">
                          Заказ #{order.id}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </div>

                      {/* Дата и город */}
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
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
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {formatDate(order.created_at)}
                        </div>
                        <div className="flex items-center gap-2">
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
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                          </svg>
                          {order.delivery_city}
                        </div>
                        {order.truck_identifier && (
                          <div className="flex items-center gap-2 col-span-2">
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
                                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                              />
                            </svg>
                            Фура:{" "}
                            <span className="font-semibold text-gray-900">
                              {order.truck_identifier}
                            </span>
                            {order.truck_arrival_date && (
                              <span className="text-gray-600">
                                ({formatDate(order.truck_arrival_date)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Товары в заказе */}
                      {order.items && order.items.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-gray-600 font-semibold mb-2">
                            Товары:
                          </p>
                          <div className="space-y-1">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="text-sm text-gray-700">
                                • {item.product_name} × {item.quantity}
                                {item.truck_identifier && (
                                  <div className="text-xs text-gray-600 ml-4">
                                    Фура: {item.truck_identifier}
                                    {item.truck_arrival_date && (
                                      <span>
                                        {" "}
                                        • {formatDate(item.truck_arrival_date)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <div className="text-sm text-gray-600">
                                + ещё {order.items.length - 2}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Сумма */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#568a56]">
                        {formatPrice(order.total_amount)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {order.items?.length || 0} товар
                        {order.items?.length === 1 ? "" : "ов"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
