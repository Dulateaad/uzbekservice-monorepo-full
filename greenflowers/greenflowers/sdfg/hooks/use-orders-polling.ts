/* Hook для отслеживания обновления статуса заказов в реальном времени */
import { useEffect, useRef } from "react";
import { api } from "@/lib/api-client";

interface Order {
  id: number;
  status: string;
  [key: string]: any;
}

export function useOrdersPolling(
  orders: Order[],
  onOrdersUpdate: (orders: Order[]) => void,
  userId: number | null,
  enabled: boolean = true,
  intervalMs: number = 10000, // polling each 10 seconds
) {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !userId || !orders || orders.length === 0) {
      return;
    }

    const poll = async () => {
      try {
        // Загружаем обновлённый список заказов
        const response = await api.getUserOrders(userId);
        const updatedOrders = response.orders || [];

        // Проверяем, изменился ли статус каких-то заказов
        let hasChanges = false;
        const mergedOrders = orders.map((order) => {
          const updated = updatedOrders.find((u) => u.id === order.id);
          if (updated && updated.status !== order.status) {
            hasChanges = true;
            return { ...order, status: updated.status };
          }
          return order;
        });

        if (hasChanges) {
          console.log("[OrdersPolling] Status changes detected, updating...");
          onOrdersUpdate(mergedOrders);
        }
      } catch (error) {
        console.error("[OrdersPolling] Error:", error);
        // Продолжаем polling даже при ошибке
      }
    };

    // Первый опрос через 5 секунд
    const initialTimeout = setTimeout(poll, 5000);

    // Регулярный polling
    pollingIntervalRef.current = setInterval(poll, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [enabled, userId, orders, onOrdersUpdate, intervalMs]);
}
