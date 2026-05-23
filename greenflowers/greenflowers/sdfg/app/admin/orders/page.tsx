"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { staffBasePathFromPathname } from "@/lib/staff-base-path";
import { api } from "@/lib/api-client";
import FilterModal from "@/components/orders/FilterModal";
import { useAdminOrdersPolling } from "@/hooks/use-admin-orders-polling";
import { DashboardLayout } from "@/components/dashboard-layout";

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
  id: number | string;
  user_id: number;
  total_amount: number;
  status: string;
  delivery_city: string;
  delivery_date: string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  delivery_address?: string;
  truck_id?: string | null;
  truck_identifier?: string | null;
  truck_arrival_date?: string | null;
  assigned_to?: number | null;
  /** pending | paid | refunded */
  payment_status?: string | null;
  items?: OrderItem[];
  discount?: {
    type: "fixed" | "percent";
    value: number;
  };
  discount_amount?: number;
}

const STATUS_COLORS: { [key: string]: string } = {
  new: "bg-red-100 text-red-800 border-red-300",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  processing: "bg-blue-100 text-blue-800 border-blue-300",
  in_progress: "bg-blue-100 text-blue-800 border-blue-300",
  confirmed: "bg-green-100 text-green-800 border-green-300",
  shipped: "bg-purple-100 text-purple-800 border-purple-300",
  delivered: "bg-gray-200 text-gray-600 border-gray-300",
  cancelled: "bg-red-200 text-red-600 border-red-300",
  refunded: "bg-orange-100 text-orange-900 border-orange-300",
};

const STATUS_LABELS: { [key: string]: string } = {
  new: "Новый",
  pending: "Ожидание",
  processing: "Обработка",
  in_progress: "В процессе",
  confirmed: "Подтверждён",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возвращён",
};

// Функция для получения приоритета статуса при сортировке
const getStatusPriority = (status: string): number => {
  const priorities: { [key: string]: number } = {
    new: 1,
    pending: 1,
    processing: 2,
    in_progress: 2,
    confirmed: 2,
    shipped: 2,
    delivered: 3,
    refunded: 3,
    cancelled: 4,
  };
  return priorities[status] || 5;
};

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const pathname = usePathname();
  const staffBase = staffBasePathFromPathname(pathname);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<any>({
    orderNumber: "",
    status: "",
    customer: "",
    city: "",
    deliveryDateFrom: "",
    deliveryDateTo: "",
    orderDateFrom: "",
    orderDateTo: "",
    amountFrom: "",
    amountTo: "",
    sortBy: "created_at",
    sortOrder: "desc",
  });
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number | string>>(new Set());
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<number | string | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState("fixed");
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    delivery_city: "",
    delivery_address: "",
    delivery_date: "",
    total_amount: "",
  });
  const [products, setProducts] = useState<
    Array<{
      id: number;
      name: string;
      price: number;
      image_url?: string;
    }>
  >([]);
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      product_id: number;
      product_name: string;
      quantity: number;
      unit_price: number;
    }>
  >([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        // Загружаем заказы с БД
        const response = await api.getAllOrders(1);
        console.log("[Admin Orders] API Response:", response);

        // Проверяем структуру ответа от API
        if (response?.orders && Array.isArray(response.orders)) {
          setOrders(response.orders);
        } else if (response && Array.isArray(response)) {
          setOrders(response);
        } else if (response?.data && Array.isArray(response.data)) {
          setOrders(response.data);
        } else {
          console.warn(
            "[Admin Orders] Unexpected response structure:",
            response,
          );
          setOrders([]);
        }

        // Инициализируем товары из склада
        setProducts([
          {
            id: 1,
            name: "Белые розы",
            price: 90,
            image_url: "https://via.placeholder.com/100?text=Розы",
          },
          {
            id: 2,
            name: "Красные розы",
            price: 100,
            image_url: "https://via.placeholder.com/100?text=Розы",
          },
          {
            id: 3,
            name: "Эустомы",
            price: 140,
            image_url: "https://via.placeholder.com/100?text=Эустомы",
          },
          {
            id: 4,
            name: "Хризантемы",
            price: 130,
            image_url: "https://via.placeholder.com/100?text=Хризантемы",
          },
          {
            id: 5,
            name: "Тюльпаны",
            price: 85,
            image_url: "https://via.placeholder.com/100?text=Тюльпаны",
          },
          {
            id: 6,
            name: "Гвоздики",
            price: 75,
            image_url: "https://via.placeholder.com/100?text=Гвоздики",
          },
        ]);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Polling для обновления статуса заказов в реальном времени на админ-панели
  useAdminOrdersPolling(
    orders,
    (updatedOrders: any[]) => setOrders(updatedOrders as Order[]),
    1, // admin user ID (или можно использовать user?.id)
    true, // enabled
    15000, // poll every 15 seconds
  );

  const filteredOrders = orders
    .filter((order) => {
      // Поиск по номеру заказа и имени
      const matchesSearch =
        order.id.toString().startsWith(searchTerm) ||
        (order.customer_name &&
          order.customer_name
            .toLowerCase()
            .startsWith(searchTerm.toLowerCase()));

      // Старый фильтр по статусу
      const matchesStatus =
        selectedStatus === "all" || order.status === selectedStatus;

      // Новые фильтры из FilterModal
      const matchesOrderNumber =
        !appliedFilters.orderNumber ||
        order.id.toString().startsWith(appliedFilters.orderNumber);

      const matchesFilterStatus =
        !appliedFilters.status || order.status === appliedFilters.status;

      const matchesCustomer =
        !appliedFilters.customer ||
        (order.customer_name &&
          order.customer_name
            .toLowerCase()
            .startsWith(appliedFilters.customer.toLowerCase())) ||
        (order.customer_email &&
          order.customer_email
            .toLowerCase()
            .startsWith(appliedFilters.customer.toLowerCase()));

      const matchesCity =
        !appliedFilters.city || order.delivery_city === appliedFilters.city;

      const orderDate = new Date(order.created_at);
      const deliveryDate = new Date(order.delivery_date);

      const matchesOrderDateFrom =
        !appliedFilters.orderDateFrom ||
        orderDate >= new Date(appliedFilters.orderDateFrom);

      const matchesOrderDateTo =
        !appliedFilters.orderDateTo ||
        orderDate <= new Date(appliedFilters.orderDateTo);

      const matchesDeliveryDateFrom =
        !appliedFilters.deliveryDateFrom ||
        deliveryDate >= new Date(appliedFilters.deliveryDateFrom);

      const matchesDeliveryDateTo =
        !appliedFilters.deliveryDateTo ||
        deliveryDate <= new Date(appliedFilters.deliveryDateTo);

      const matchesAmountFrom =
        !appliedFilters.amountFrom ||
        order.total_amount >= parseFloat(appliedFilters.amountFrom);

      const matchesAmountTo =
        !appliedFilters.amountTo ||
        order.total_amount <= parseFloat(appliedFilters.amountTo);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesOrderNumber &&
        matchesFilterStatus &&
        matchesCustomer &&
        matchesCity &&
        matchesOrderDateFrom &&
        matchesOrderDateTo &&
        matchesDeliveryDateFrom &&
        matchesDeliveryDateTo &&
        matchesAmountFrom &&
        matchesAmountTo
      );
    })
    .sort((a, b) => {
      // Сначала сортируем по приоритету статуса (pending → in_progress → delivered)
      const aPriority = getStatusPriority(a.status);
      const bPriority = getStatusPriority(b.status);

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Затем сортируем по дате или другому полю внутри одного приоритета
      const sortField = appliedFilters.sortBy || "created_at";
      let aValue: any = a[sortField as keyof Order];
      let bValue: any = b[sortField as keyof Order];

      if (sortField === "created_at" || sortField === "delivery_date") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (appliedFilters.sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

  const toggleOrderSelection = (orderId: number | string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  // when a manager clicks "Взять", call API then update local state so order moves to "Мои" list
  const handleTakeOrder = async (orderId: number | string) => {
    if (!user) return;
    try {
      await api.takeOrder(user.id, orderId);
      // update local cache optimistically
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, assigned_to: user.id } : o,
        ),
      );
    } catch (err) {
      console.error("take order failed", err);
      alert("Не удалось взять заказ");
    }
  };

  const handleRefundOrder = async (orderId: number | string) => {
    if (!user) return;
    if (!confirm("Вы уверены? Статус заказа станет «Возвращён», сумма уйдёт в блок возвратов в аналитике.")) return;
    try {
      const res = await api.refundOrder(user.id, orderId);
      if (!res?.success) {
        throw new Error(res?.error || "Ошибка возврата");
      }
      window.dispatchEvent(new CustomEvent("order:statusChanged"));
      window.location.reload();
    } catch (err) {
      console.error("refund order failed", err);
      alert(
        "Не удалось пометить заказ как возврат: " +
          (err instanceof Error ? err.message : ""),
      );
    }
  };

  // render a full order card including actions/checkboxes; reused by both "my" and "other" sections
  const renderOrderCard = (order: Order) => {
    const isRefunded =
      order.status === "refunded" ||
      String(order.payment_status || "").toLowerCase() === "refunded";
    const isFinished =
      ["delivered", "cancelled", "refunded"].includes(order.status) || isRefunded;

    return (
      <div
        key={order.id}
        className={`rounded-2xl border-2 transition p-6 ${
          isFinished
            ? "bg-gray-100 border-gray-300 opacity-65"
            : "bg-white border-gray-200 hover:shadow-lg"
        } ${
          isSelectMode && !isFinished
            ? selectedOrders.has(order.id)
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 cursor-pointer"
            : ""
        }`}
        onClick={() =>
          !isFinished && isSelectMode && toggleOrderSelection(order.id)
        }
      >
        {/* Верхняя строка */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-1">
            {isSelectMode && (
              <input
                type="checkbox"
                checked={selectedOrders.has(order.id)}
                onChange={() => toggleOrderSelection(order.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 rounded border-gray-300 cursor-pointer"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-2xl font-bold text-gray-900">
                  Заказ #{order.id}
                </h3>
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full border ${
                    STATUS_COLORS[order.status] || STATUS_COLORS.pending
                  }`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-1">
                {order.customer_name || "Клиент"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Телефон:</span>{" "}
                  {order.customer_phone || "—"}
                </div>
                <div>
                  <span className="font-medium">Email:</span>{" "}
                  {order.customer_email || "—"}
                </div>
                <div>
                  <span className="font-medium">Город:</span>{" "}
                  {order.delivery_city}
                </div>
                <div>
                  <span className="font-medium">Адрес:</span>{" "}
                  {order.delivery_address || "—"}
                </div>
                <div>
                  <span className="font-medium">Дата доставки:</span>{" "}
                  {formatDate(order.delivery_date)}
                </div>
                <div>
                  <span className="font-medium">Создан:</span>{" "}
                  {formatDateTime(order.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Сумма заказа */}
          <div className="text-right">
            <div className="text-4xl font-bold text-[#568a56] mb-2">
              {Number(order.total_amount).toLocaleString()} ₸
            </div>
            <div className="text-xs text-gray-500">Сумма заказа</div>
            {order.discount && (
              <div className="mt-3 pt-3 border-t border-red-200 text-left">
                <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                  Скидка:{" "}
                  {order.discount.type === "percent"
                    ? `${order.discount.value}%`
                    : `${order.discount.value.toLocaleString()} ₸`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Товары */}
        {order.items && order.items.length > 0 && (
          <div className="border-t border-gray-200 pt-4 mb-4">
            <p className="font-semibold text-gray-900 mb-3">Товары:</p>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.product_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Количество: {item.quantity} шт.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {(
                          Number(item.unit_price) * Number(item.quantity)
                        ).toLocaleString()}{" "}
                        ₸
                      </p>
                      <p className="text-xs text-gray-500">
                        {Number(item.unit_price).toLocaleString()} ₸ за шт.
                      </p>
                    </div>
                  </div>
                  {/* Информация о фуре для этого товара */}
                  {item.truck_identifier && (
                    <p className="text-xs text-gray-600 pt-1 border-t border-gray-200">
                      <span className="font-semibold">Фура:</span>{" "}
                      {item.truck_identifier}
                      {item.truck_arrival_date && (
                        <span className="text-gray-600">
                          {" "}
                          • {formatDate(item.truck_arrival_date)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Действия */}
        <div className="flex flex-wrap gap-3">
          {/* Кнопка Статус — отключена для завершённых заказов */}
          <button
            disabled={isFinished}
            onClick={() => {
              setActiveOrderId(order.id);
              setNewStatus(order.status);
              setShowStatusModal(true);
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
              isFinished
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-[#568a56] hover:bg-[#457245] text-white"
            }`}
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
            Статус
          </button>

          {/* Кнопка Скидка — отключена для завершённых заказов */}
          <button
            disabled={isFinished}
            onClick={() => {
              setActiveOrderId(order.id);
              setDiscountValue("");
              setDiscountType("fixed");
              setShowDiscountModal(true);
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
              isFinished
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-orange-600 hover:bg-orange-700 text-white"
            }`}
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Скидка
          </button>

          {/* Кнопка Скачать — ВСЕГДА активна */}
          <button
            onClick={() => handleDownloadInvoice(order.id)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-2"
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Скачать
          </button>

          {/* Кнопка "Взять" — показываем если заказ не назначен и не завершён */}
          {(!order.assigned_to || order.assigned_to === null) &&
            ["new", "pending"].includes(order.status) &&
            !isFinished && (
              <button
                onClick={() => handleTakeOrder(order.id)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
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
                    d="M9 12l2 2 4-4"
                  />
                </svg>
                Взять
              </button>
            )}

          {/* Кнопка «Возврат» — только для доставленных и ещё не возвращённых */}
          {order.status === "delivered" && !isRefunded && (
            <button
              onClick={() => handleRefundOrder(order.id)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
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
                  d="M9 15L3 9m0 0l6-6m-6 6h18a9 9 0 010 18H9a9 9 0 010-18z"
                />
              </svg>
              Возврат
            </button>
          )}
        </div>
      </div>
    );
  };

  const selectAllFiltered = () => {
    if (
      selectedOrders.size === filteredOrders.length &&
      filteredOrders.length > 0
    ) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedOrders.size === 0) return;
    if (
      confirm(
        `Вы уверены, что хотите удалить ${selectedOrders.size} заказ(ов)?`,
      )
    ) {
      try {
        // Преобразуем Set в массив ID
        const orderIds = Array.from(selectedOrders);
        console.log("[Delete Orders] IDs to delete:", orderIds);

        // Отправляем DELETE запрос на backend
        // Для админа не передаем user_id (удаляем любые заказы)
        // Для работника передаем его user_id (удаляем только свои заказы)
        const userId = user?.role === "admin" ? undefined : user?.id;
        const response = await api.deleteOrders(orderIds, userId);
        console.log("[Delete Orders] API Response:", response);

        if (response?.success) {
          // Удаляем из локального state ТОЛЬКО если backend подтвердил удаление
          setOrders(orders.filter((o) => !selectedOrders.has(o.id)));
          setSelectedOrders(new Set());
          setIsSelectMode(false);
          alert(`Успешно удалено ${response.deleted_count} заказ(ов)`);
        } else {
          throw new Error(response?.error || "Ошибка при удалении заказов");
        }
      } catch (error) {
        console.error("[Delete Orders] Error:", error);
        alert(
          "Ошибка при удалении заказов: " +
            (error instanceof Error ? error.message : "Unknown error"),
        );
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStatusChange = async (orderId: number | string) => {
    if (!newStatus || !orderId) return;
    try {
      console.log(
        "[Status Change] Updating order",
        orderId,
        "to status:",
        newStatus,
      );

      // Отправляем PUT запрос на backend
      const response = await api.updateOrderStatus(
        user?.id || 1,
        orderId,
        newStatus,
      );
      console.log("[Status Change] API Response:", response);

      // Обновляем state ТОЛЬКО если backend подтвердил изменение
      if (response?.success && response?.order) {
        setOrders(
          orders.map((o) =>
            o.id === orderId ? { ...o, status: response.order.status } : o,
          ),
        );
        alert("Статус успешно обновлен");

        // уведомляем остальные страницы (например, /admin/shifts) о том, что один из заказов поменялся
        try {
          window.dispatchEvent(
            new CustomEvent("order:statusChanged", {
              detail: {
                orderId,
                newStatus: response.order.status,
                truckId: response.order.truck_id,
                city: response.order.city,
                totalAmount: response.order.total_amount,
              },
            }),
          );
        } catch (evErr) {
          console.warn("order:statusChanged dispatch failed", evErr);
        }
      } else {
        throw new Error(response?.error || "Ошибка при обновлении статуса");
      }
    } catch (error) {
      console.error("[Status Change] Error:", error);
      alert(
        "Ошибка при изменении статуса: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setShowStatusModal(false);
      setActiveOrderId(null);
      setNewStatus("");
    }
  };

  const handleDownloadInvoice = async (orderId: number | string) => {
    try {
      console.log("[Download Invoice] Starting download for order", orderId);
      await api.downloadInvoice(orderId, 1);
      console.log("[Download Invoice] Success");
    } catch (error) {
      console.error("[Download Invoice] Error:", error);
      alert(
        "Ошибка при скачивании накладной: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  const handleApplyDiscount = async (orderId: number | string) => {
    if (!discountValue || !orderId || !user?.id) return;
    const discount = parseFloat(discountValue);
    if (isNaN(discount) || discount < 0) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const currentTotal = order.total_amount;
    let newTotal = currentTotal;
    if (discountType === "fixed") {
      newTotal = Math.max(0, currentTotal - discount);
    } else {
      newTotal = Math.max(0, currentTotal * (1 - discount / 100));
    }
    const discount_amount =
      Math.round((currentTotal - newTotal) * 100) / 100;
    const discountObj = {
      type: discountType as "fixed" | "percent",
      value: discount,
    };

    try {
      const res = await api.updateOrderDiscount(user.id, orderId, {
        total_amount: newTotal,
        discount: discountObj,
        discount_amount,
      });
      if (!res || !("success" in res) || !res.success) {
        const msg =
          res && typeof res === "object" && "error" in res
            ? String((res as { error?: string }).error || "")
            : "";
        throw new Error(msg || "Не удалось сохранить скидку");
      }
      setOrders(
        orders.map((o) => {
          if (o.id === orderId) {
            return {
              ...o,
              total_amount: newTotal,
              discount: discountObj,
              discount_amount,
            };
          }
          return o;
        }),
      );
      setShowDiscountModal(false);
      setActiveOrderId(null);
      setDiscountValue("");
      window.dispatchEvent(new CustomEvent("order:statusChanged"));
    } catch (e) {
      alert(
        e instanceof Error ? e.message : "Ошибка сохранения скидки в Firestore",
      );
    }
  };

  const handleAddOrder = async () => {
    if (
      !newOrderForm.customer_name ||
      !newOrderForm.customer_phone ||
      !newOrderForm.delivery_city ||
      !newOrderForm.delivery_date
    ) {
      alert("Пожалуйста, заполните все обязательные поля");
      return;
    }

    // Рассчитаем сумму из выбранных товаров или используем введённую сумму
    let totalAmount = 0;
    if (selectedItems.length > 0) {
      totalAmount = selectedItems.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      );
    } else {
      totalAmount = parseFloat(newOrderForm.total_amount || "0");
    }

    try {
      // Сохраняем заказ в БД
      const response = await api.createOrder({
        customer_name: newOrderForm.customer_name,
        customer_phone: newOrderForm.customer_phone,
        customer_email: newOrderForm.customer_email,
        delivery_city: newOrderForm.delivery_city,
        delivery_address: newOrderForm.delivery_address,
        delivery_date: newOrderForm.delivery_date,
        total_amount: totalAmount,
        status: "pending",
        items: selectedItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        user_id: 1,
        payment_status: "pending",
      });

      // Если успешно, добавляем в локальный список
      if (response.order && response.order.id) {
        const newOrder: Order = {
          id: response.order.id,
          user_id: response.order.user_id || 1,
          total_amount: totalAmount,
          status: "pending",
          delivery_city: newOrderForm.delivery_city,
          delivery_date: newOrderForm.delivery_date,
          created_at: new Date().toISOString(),
          customer_name: newOrderForm.customer_name,
          customer_phone: newOrderForm.customer_phone,
          customer_email: newOrderForm.customer_email,
          delivery_address: newOrderForm.delivery_address,
          items: selectedItems,
        };

        // Добавляем заказ в НАЧАЛО списка
        setOrders([newOrder, ...orders]);
        setShowAddOrderModal(false);
        setNewOrderForm({
          customer_name: "",
          customer_phone: "",
          customer_email: "",
          delivery_city: "",
          delivery_address: "",
          delivery_date: "",
          total_amount: "",
        });
        setSelectedItems([]);
        alert("Заказ успешно создан!");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert(
        "Ошибка при создании заказа: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  return (
    <DashboardLayout title="Заказы" requiredRole={["admin", "worker"]}>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Основной контент */}
        <main className="flex-1 flex flex-col pb-24">
          {/* Верхняя панель */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="p-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <Link href={staffBase}>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                      <svg
                        className="w-6 h-6 text-gray-700"
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
                  </Link>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Менеджер: Заказы покупателей
                  </h1>
                </div>

                {/* Кнопки в хэдере */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowFilterModal(true)}
                    className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                      Object.values(appliedFilters).some(
                        (v) => v && v !== "created_at" && v !== "desc",
                      )
                        ? "bg-[#568a56] text-white hover:bg-[#467044]"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                    }`}
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
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    Фильтр
                  </button>

                  {!isSelectMode ? (
                    <>
                      <button
                        onClick={() => setShowAddOrderModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
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
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Создать заказ
                      </button>
                      <button
                        onClick={() => setIsSelectMode(true)}
                        className="px-4 py-2 bg-[#568a56] hover:bg-[#457245] text-white rounded-lg font-semibold transition"
                      >
                        Выбрать
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={selectAllFiltered}
                        className={`px-4 py-2 rounded-lg font-semibold transition ${
                          selectedOrders.size === filteredOrders.length &&
                          filteredOrders.length > 0
                            ? "bg-gray-400 text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                        }`}
                      >
                        {selectedOrders.size === filteredOrders.length &&
                        filteredOrders.length > 0
                          ? "Снять"
                          : "Выбрать все"}
                      </button>
                      <button
                        onClick={handleDeleteSelected}
                        disabled={selectedOrders.size === 0}
                        className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                          selectedOrders.size === 0
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
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
                        Удалить
                      </button>
                      <button
                        onClick={() => {
                          setIsSelectMode(false);
                          setSelectedOrders(new Set());
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition"
                      >
                        Отмена
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Панель фильтрации */}
              {showFilter && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setSelectedStatus("all")}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        selectedStatus === "all"
                          ? "bg-[#568a56] text-white"
                          : "bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Все
                    </button>
                    {Object.entries(STATUS_LABELS).map(([status, label]) => (
                      <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          selectedStatus === status
                            ? "bg-[#568a56] text-white"
                            : "bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Список заказов */}
          <div className="flex-1 p-6 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Загрузка заказов...</div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-gray-500 text-lg">Заказы не найдены</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Сначала показываем раздел "Мои заказы" */}
                {user && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3">Мои заказы</h2>
                    {filteredOrders
                      .filter(
                        (o) =>
                          o.assigned_to === user.id &&
                          !["delivered", "cancelled"].includes(o.status),
                      )
                      .map(renderOrderCard)}
                  </div>
                )}

                {/* Другие заказы (только новые/незанятые) */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-3">Другие заказы</h2>
                  {filteredOrders
                    .filter(
                      (o) =>
                        o.assigned_to === null &&
                        ["new", "pending"].includes(o.status),
                    )
                    .map(renderOrderCard)}
                </div>

                {/* Завершённые заказы (delivered и cancelled) внизу */}
                <div className="mt-8 pt-8 border-t-4 border-gray-300">
                  <h2 className="text-lg font-bold mb-3 text-gray-600">
                    Завершённые заказы
                  </h2>
                  {filteredOrders.filter((o) =>
                    ["delivered", "cancelled"].includes(o.status),
                  ).length > 0 ? (
                    filteredOrders
                      .filter((o) =>
                        ["delivered", "cancelled"].includes(o.status),
                      )
                      .map(renderOrderCard)
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Нет завершённых заказов
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Модальное окно для изменения статуса */}
        {showStatusModal && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Изменить статус заказа #{activeOrderId}
              </h2>
              <div className="space-y-3 mb-6">
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                  <button
                    key={status}
                    onClick={() => setNewStatus(status)}
                    className={`w-full px-4 py-3 rounded-lg font-semibold transition text-left ${
                      newStatus === status
                        ? "bg-[#568a56] text-white"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleStatusChange(activeOrderId!)}
                  className="flex-1 px-4 py-3 bg-[#568a56] hover:bg-[#457245] text-white rounded-lg font-semibold transition"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно для добавления скидки */}
        {showDiscountModal && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Добавить скидку к заказу #{activeOrderId}
              </h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип скидки
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDiscountType("fixed")}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                        discountType === "fixed"
                          ? "bg-[#568a56] text-white"
                          : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      }`}
                    >
                      ₸ Сумма
                    </button>
                    <button
                      onClick={() => setDiscountType("percent")}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                        discountType === "percent"
                          ? "bg-[#568a56] text-white"
                          : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      }`}
                    >
                      % Процент
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Размер скидки {discountType === "percent" ? "(%)" : "(₸)"}
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="Введите значение"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#568a56] focus:outline-none transition"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleApplyDiscount(activeOrderId!)}
                  className="flex-1 px-4 py-3 bg-[#568a56] hover:bg-[#457245] text-white rounded-lg font-semibold transition"
                >
                  Применить
                </button>
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно для добавления заказа */}
        {showAddOrderModal && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Создать новый заказ
              </h2>
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Имя клиента *
                    </label>
                    <input
                      type="text"
                      value={newOrderForm.customer_name}
                      onChange={(e) =>
                        setNewOrderForm({
                          ...newOrderForm,
                          customer_name: e.target.value,
                        })
                      }
                      placeholder="Например: Иван Петров"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#568a56] focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Телефон *
                    </label>
                    <input
                      type="tel"
                      value={newOrderForm.customer_phone}
                      onChange={(e) =>
                        setNewOrderForm({
                          ...newOrderForm,
                          customer_phone: e.target.value,
                        })
                      }
                      placeholder="+7 (700) 123-45-67"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#568a56] focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newOrderForm.customer_email}
                      onChange={(e) =>
                        setNewOrderForm({
                          ...newOrderForm,
                          customer_email: e.target.value,
                        })
                      }
                      placeholder="example@mail.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#568a56] focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Город доставки *
                    </label>
                    <input
                      type="text"
                      value={newOrderForm.delivery_city}
                      onChange={(e) =>
                        setNewOrderForm({
                          ...newOrderForm,
                          delivery_city: e.target.value,
                        })
                      }
                      placeholder="Например: Алматы"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#568a56] focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Адрес доставки
                  </label>
                  <input
                    type="text"
                    value={newOrderForm.delivery_address}
                    onChange={(e) =>
                      setNewOrderForm({
                        ...newOrderForm,
                        delivery_address: e.target.value,
                      })
                    }
                    placeholder="Ул. Абая, д. 155, кв. 10"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#568a56] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Выберите товары
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          const existingItem = selectedItems.find(
                            (item) => item.product_id === product.id,
                          );
                          if (existingItem) {
                            setSelectedItems(
                              selectedItems.map((item) =>
                                item.product_id === product.id
                                  ? { ...item, quantity: item.quantity + 50 }
                                  : item,
                              ),
                            );
                          } else {
                            setSelectedItems([
                              ...selectedItems,
                              {
                                product_id: product.id,
                                product_name: product.name,
                                quantity: 100,
                                unit_price: product.price,
                              },
                            ]);
                          }
                        }}
                        className={`p-3 rounded-lg font-semibold text-sm transition ${
                          selectedItems.some(
                            (item) => item.product_id === product.id,
                          )
                            ? "bg-[#568a56] text-white border-2 border-[#568a56]"
                            : "bg-gray-100 text-gray-900 border-2 border-gray-200 hover:border-[#568a56]"
                        }`}
                      >
                        <div className="text-xs">{product.name}</div>
                        <div className="text-xs opacity-75">
                          {product.price} ₸
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedItems.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Выбранные товары:
                    </h4>
                    <div className="space-y-2">
                      {selectedItems.map((item) => (
                        <div
                          key={item.product_id}
                          className="flex justify-between items-center p-3 bg-white rounded border border-gray-200"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {item.product_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.unit_price} ₸ за шт.
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-gray-300 rounded-lg">
                              <button
                                onClick={() =>
                                  setSelectedItems(
                                    selectedItems.map((i) =>
                                      i.product_id === item.product_id
                                        ? {
                                            ...i,
                                            quantity: Math.max(
                                              1,
                                              i.quantity - 10,
                                            ),
                                          }
                                        : i,
                                    ),
                                  )
                                }
                                className="px-2 py-1 hover:bg-gray-100 text-gray-700 font-bold"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQty = Math.max(
                                    1,
                                    parseInt(e.target.value) || 1,
                                  );
                                  setSelectedItems(
                                    selectedItems.map((i) =>
                                      i.product_id === item.product_id
                                        ? { ...i, quantity: newQty }
                                        : i,
                                    ),
                                  );
                                }}
                                className="w-12 text-center border-l border-r border-gray-300 py-1 focus:outline-none"
                              />
                              <button
                                onClick={() =>
                                  setSelectedItems(
                                    selectedItems.map((i) =>
                                      i.product_id === item.product_id
                                        ? { ...i, quantity: i.quantity + 10 }
                                        : i,
                                    ),
                                  )
                                }
                                className="px-2 py-1 hover:bg-gray-100 text-gray-700 font-bold"
                              >
                                +
                              </button>
                            </div>
                            <div className="w-24 text-right">
                              <div className="font-bold text-gray-900">
                                {(
                                  item.quantity * item.unit_price
                                ).toLocaleString()}{" "}
                                ₸
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                setSelectedItems(
                                  selectedItems.filter(
                                    (i) => i.product_id !== item.product_id,
                                  ),
                                )
                              }
                              className="text-red-600 hover:text-red-800 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200 text-right font-bold text-gray-900">
                      Итого:{" "}
                      {selectedItems
                        .reduce(
                          (sum, item) => sum + item.quantity * item.unit_price,
                          0,
                        )
                        .toLocaleString()}{" "}
                      ₸
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Дата доставки *
                    </label>
                    <input
                      type="date"
                      value={newOrderForm.delivery_date}
                      onChange={(e) =>
                        setNewOrderForm({
                          ...newOrderForm,
                          delivery_date: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#568a56] focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Сумма заказа (₸) *
                    </label>
                    <input
                      type="number"
                      value={newOrderForm.total_amount}
                      onChange={(e) =>
                        setNewOrderForm({
                          ...newOrderForm,
                          total_amount: e.target.value,
                        })
                      }
                      placeholder="50000"
                      min="0"
                      step="100"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#568a56] focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddOrder}
                  className="flex-1 px-4 py-3 bg-[#568a56] hover:bg-[#457245] text-white rounded-lg font-semibold transition"
                >
                  Создать заказ
                </button>
                <button
                  onClick={() => {
                    setShowAddOrderModal(false);
                    setNewOrderForm({
                      customer_name: "",
                      customer_phone: "",
                      customer_email: "",
                      delivery_city: "",
                      delivery_address: "",
                      delivery_date: "",
                      total_amount: "",
                    });
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Modal */}
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={(filters) => {
            setAppliedFilters(filters);
            // Здесь можно добавить логику отправки фильтров на сервер
            // или применить фильтры к локальному списку заказов
          }}
          initialFilters={appliedFilters}
          cities={["Алматы", "Астана", "Атырау", "Актау", "Кокшетау", "Тараз"]}
        />
      </div>
    </DashboardLayout>
  );
}
