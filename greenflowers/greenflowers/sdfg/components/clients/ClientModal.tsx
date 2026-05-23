"use client";
import React, { useState, useEffect } from "react";

export default function ClientModal({
  visible,
  onClose,
  onSave,
  initial,
}: any) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (initial) {
      setName(initial.name || "");
      setPhone(initial.phone || "");
      setEmail(initial.email || "");
      setAddress(initial.address || "");
      setComment(initial.comment || "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setComment("");
    }
  }, [initial, visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{ width: 640, background: "#fff", borderRadius: 8, padding: 16 }}
      >
        <h3>{initial ? "Редактировать клиента" : "Новый клиент"}</h3>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <input
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Адрес"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <textarea
            placeholder="Комментарий"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ gridColumn: "1 / -1" }}
          />
        </div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button onClick={onClose}>Отмена</button>
          <button
            onClick={() => onSave({ name, phone, email, address, comment })}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
