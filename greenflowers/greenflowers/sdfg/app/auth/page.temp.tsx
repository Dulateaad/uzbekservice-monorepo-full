"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useLanguageContext } from "@/contexts/language-context";
import { kazakhstanCities } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const { language } = useLanguageContext();
  const router = useRouter();

  const handleSendCode = async () => {
    setError("");
    setMessage("");

    if (!phone) {
      setError("Укажите номер телефона");
      return;
    }
    setLoading(true);
    const result = await sendSmsCode(phone);
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
      setError("Введите номер телефона и код");
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
      router.push("/client/dashboard");
    } else {
      setError(result.error || "Ошибка аутентификации");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-green-100 p-8">
          <Link href="/" className="flex items-center justify-center gap-3 mb-8">
            <Image src="/logo.png" alt="Spray Flowers" width={48} height={48} className="h-12 w-auto" />
            <span className="font-bold text-[#568a56] text-xl">Spray Flowers</span>
          </Link>

          <div className="flex mb-6 bg-green-50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === "login" ? "bg-white text-[#568a56] shadow-sm" : "text-gray-600 hover:text-[#568a56]"
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === "register" ? "bg-white text-[#568a56] shadow-sm" : "text-gray-600 hover:text-[#568a56]"
              }`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="mt-1"
                  required
                />
              </div>
              <Button type="button" onClick={handleSendCode} className="mt-6" disabled={loading}>
                {loading ? "Отправка..." : "Отправить код"}
              </Button>
            </div>

            {mode === "register" && (
              <>
                <div>
                  <Label htmlFor="name">Имя / Название компании</Label>
                  <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Петров" className="mt-1" required />
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

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
            {message && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{message}</div>}

            <Button type="submit" disabled={loading} className="w-full bg-[#568a56] hover:bg-[#457245] text-white py-3">
              {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-[#568a56] hover:underline">
              {mode === "login" ? "Зарегистрироваться" : "Войти"}
            </button>
          </p>

          <p className="text-center text-gray-500 text-sm mt-4">
            <Link href="/" className="text-[#568a56] hover:underline">
              ← Вернуться на главную
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
'''
Path = Path('sdfg/app/auth/page.tsx')
Path.write_text(content, encoding='utf-8')
print('done')
PY