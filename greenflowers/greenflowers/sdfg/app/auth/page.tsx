"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { kazakhstanCities } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function postLoginPathForRole(role: string | undefined) {
  const raw = String(role || "user").trim().toLowerCase();
  const normalized = raw === "employee" ? "worker" : raw;
  const routes: Record<string, string> = {
    admin: "/admin/orders",
    worker: "/employee",
    user: "/",
  };
  return routes[normalized] || "/";
}

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register, sendSmsCode } = useAuth();
  const router = useRouter();

  const handleSendCode = async () => {
    setError("");
    setMessage("");

    if (!phone) {
      setError("Укажите номер телефона");
      return;
    }

    setLoading(true);
    const result = await sendSmsCode(phone, {
      containerId: "gf-recaptcha-auth-inline",
      size: "normal",
    });
    setLoading(false);

    if (result.success) {
      setMessage("Код отправлен. Проверьте SMS.");
    } else {
      setError(result.error || "Не удалось отправить код");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!phone || !code) {
      setError("Введите номер телефона и код из SMS");
      return;
    }

    if (mode === "register" && (!name || !city)) {
      setError("Заполните имя и город для регистрации");
      return;
    }

    setLoading(true);

    const result =
      mode === "login"
        ? await login(phone, code)
        : await register(phone, code, name, city || "Алматы");

    setLoading(false);

    if (result.success) {
      const userStr = localStorage.getItem("greenflowers_user");
      if (userStr) {
        const u = JSON.parse(userStr) as { role?: string };
        router.push(postLoginPathForRole(u.role));
      } else {
        router.push("/");
      }
    } else {
      setError(result.error || "Ошибка аутентификации");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-green-100 p-8">
          <div className="text-center mb-8">
            <h1 className="font-bold text-[#568a56] text-2xl">Spray Flowers</h1>
            <p className="text-sm text-gray-500 mt-1">Вход и регистрация</p>
          </div>

          <div className="flex mb-6 bg-green-50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === "login"
                  ? "bg-white text-[#568a56] shadow-sm"
                  : "text-gray-600 hover:text-[#568a56]"
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === "register"
                  ? "bg-white text-[#568a56] shadow-sm"
                  : "text-gray-600 hover:text-[#568a56]"
              }`}
            >
              Регистрация
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4 text-center">
            Вход и регистрация только по номеру телефона и коду из SMS
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              id="gf-recaptcha-auth-inline"
              className="min-h-[78px] flex justify-center items-start"
              aria-label="Проверка reCAPTCHA"
            />

            <div>
              <Label htmlFor="phone">Номер телефона</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 777 123 4567"
                className="mt-1"
                required
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="code">Код SMS</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="mt-1"
                  required
                />
              </div>
              <Button
                type="button"
                onClick={handleSendCode}
                className="mt-6"
                disabled={loading}
              >
                {loading ? "Отправка..." : "Отправить код"}
              </Button>
            </div>

            {mode === "register" && (
              <>
                <div>
                  <Label htmlFor="name">Имя / Название компании</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Иван Петров или ТОО Цветы"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">Город</Label>
                  <select
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#568a56]"
                    required
                  >
                    <option value="">Выберите город</option>
                    {kazakhstanCities.map((c) => (
                      <option key={c.id} value={c.name.ru}>
                        {c.name.ru}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {message}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#568a56] hover:bg-[#457245] text-white py-3"
            >
              {loading
                ? "Загрузка..."
                : mode === "login"
                  ? "Войти"
                  : "Зарегистрироваться"}
            </Button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-4">
          <Link href="/" className="text-[#568a56] hover:underline">
            ← Вернуться на главную
          </Link>
        </p>
      </div>
    </div>
  );
}
