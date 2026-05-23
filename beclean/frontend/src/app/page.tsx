"use client";

import { useState } from "react";
import { RollingStatsSection } from "@/components/RollingStatsSection";

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [info, setInfo] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiUrl) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "—",
          phone: phone.trim() || "—",
          info: info.trim() || "—",
          source: "beclean.uz",
        }),
      });
      if (res.ok) {
        setStatus("success");
        setName("");
        setPhone("");
        setInfo("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-emerald-800">Beclean</h1>
          <p className="mt-2 text-lg text-emerald-600">
            Оставьте заявку — мы свяжемся с вами
          </p>
        </div>

        <RollingStatsSection />

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-emerald-100"
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Имя
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Ваше имя"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Телефон
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="+998 XX XXX XX XX"
              />
            </div>
            <div>
              <label htmlFor="info" className="block text-sm font-medium text-gray-700">
                Сообщение
              </label>
              <textarea
                id="info"
                rows={4}
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Опишите, что вам нужно..."
              />
            </div>

            {status === "success" && (
              <p className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
                Заявка отправлена. Мы скоро свяжемся с вами!
              </p>
            )}
            {status === "error" && (
              <p className="rounded-lg bg-red-50 p-3 text-red-700">
                Ошибка отправки. Попробуйте позже или позвоните нам.
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-xl bg-emerald-600 py-4 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {status === "loading" ? "Отправка..." : "Отправить заявку"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
