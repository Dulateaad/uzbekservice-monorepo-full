"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

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

export default function Login() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, sendSmsCode } = useAuth();

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
      setMessage("Код отправлен. Проверьте SMS");
    } else {
      setError(result.error || "Не удалось отправить код");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!phone || !code) {
      setError("Введите номер телефона и код из SMS");
      return;
    }

    setLoading(true);
    const result = await login(phone, code);

    if (result.success) {
      const userStr = localStorage.getItem("greenflowers_user");
      if (userStr) {
        const user = JSON.parse(userStr) as { role?: string };
        router.push(postLoginPathForRole(user.role));
      } else {
        router.push("/");
      }
    } else {
      setError(result.error || "Неверный код или номер");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Вход</h1>
          <p className="text-muted-foreground mb-6">
            Только по номеру телефона и коду из SMS
          </p>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-50 text-green-700 text-sm p-4 rounded-lg mb-6">
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div
              id="gf-recaptcha-auth-inline"
              className="min-h-[78px] flex justify-center items-start"
              aria-label="Проверка reCAPTCHA"
            />

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Номер телефона
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 777 123 4567"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Код из SMS
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors"
              >
                {loading ? "Отправка..." : "Отправить код"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>

          <p className="text-center text-muted-foreground mt-6">
            Нет аккаунта?{" "}
            <Link href="/auth/sign-up" className="text-primary hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
