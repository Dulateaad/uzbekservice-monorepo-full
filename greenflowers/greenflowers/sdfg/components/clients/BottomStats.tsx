"use client";
import React from "react";

export default function BottomStats({
  total = 0,
  balance = 0,
  totalOrders = 0,
  profit = 0,
}: any) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "#fff",
        borderTop: "1px solid #eee",
        padding: 12,
        display: "flex",
        gap: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div>
        <strong>Клиентов:</strong> {total}
      </div>
      <div>
        <strong>Общий баланс:</strong> {balance}
      </div>
      <div>
        <strong>Сумма заказов:</strong> {totalOrders}
      </div>
      <div>
        <strong>Общая прибыль:</strong> {profit}
      </div>
    </div>
  );
}
