"use client";

import React, { useEffect, useRef } from "react";

/**
 * Hook для синхронизации данных по партиям и товарам
 * Использует WebSocket или polling для real-time обновлений
 *
 * Возможности:
 * - Автоматическое обновление количества товара
 * - Обновление цены в реальном времени
 * - Удаление товара when stock = 0
 * - Добавление нового товара при поступлении
 */
export function useDeliverySyncWatch(
  batchId: number | undefined,
  onUpdate: () => void,
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    if (!batchId) return;

    // Настройка polling'а для проверки обновлений каждые 30 секунд
    const checkForUpdates = async () => {
      try {
        const now = Date.now();
        if (now - lastCheckRef.current < 30000) {
          return;
        }
        lastCheckRef.current = now;
        // Без REST: периодически обновляем каталог из Firestore через onUpdate
        onUpdate();
      } catch (err) {
        console.debug("Sync check error:", err);
      }
    };

    // Текущая схема: проверяем каждые 30 секунд
    intervalRef.current = setInterval(checkForUpdates, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [batchId, onUpdate]);
}

/**
 * Компонент для автоматического обновления данных партий
 * Следит за изменениями в базе и обновляет UI
 */
export function DeliverySyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Глобальный listener для синхронизации
    // Может быть тригирован после добавления/изменения товара на складе
    const handleInventoryChange = () => {
      // Эмитируем событие для перезагрузки данных
      window.dispatchEvent(new CustomEvent("inventory:updated"));
    };

    // Слушаем события инвентаря (когда работник добавляет/меняет товар)
    window.addEventListener("inventory:changed", handleInventoryChange);

    return () => {
      window.removeEventListener("inventory:changed", handleInventoryChange);
    };
  }, []);

  return <>{children}</>;
}

/**
 * Утилита: Эмитить событие обновления инвентаря
 * Вызывается после операций на складе
 */
export function notifyInventoryUpdate() {
  window.dispatchEvent(
    new CustomEvent("inventory:changed", {
      detail: { timestamp: Date.now() },
    }),
  );
}

/**
 * Хук для слушания обновлений инвентаря со стороны сервера
 */
export function useInventoryUpdates(callback: () => void) {
  useEffect(() => {
    window.addEventListener("inventory:changed", callback);
    return () => window.removeEventListener("inventory:changed", callback);
  }, [callback]);
}
