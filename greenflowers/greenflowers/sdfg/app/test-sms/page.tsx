"use client";

import { useState } from "react";

export default function TestSMS() {
  const [phone, setPhone] = useState("+77771234567");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const handleSendSMS = async () => {
    setLoading(true);
    setError("");
    setResult("");
    setCode("");

    try {
      const res = await fetch("/api/users/send-sms-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult("✅ SMS код отправлен!");
        if (data.code) {
          setCode(data.code);
          setResult(`✅ SMS код: ${data.code}`);
        } else {
          setResult("✅ Проверь консоль сервера для кода");
        }
      } else {
        setError(data.error || "Ошибка при отправке SMS");
      }
    } catch (err: any) {
      setError(err.message || "Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!code) {
      setError("Введи код из SMS");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const res = await fetch("/api/users/login-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: parseInt(code),
          name: "Test User",
          city: "Almaty",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult("✅ Вход успешен!");
        console.log("Token:", data.token);
      } else {
        setError(data.error || "Ошибка при входе");
      }
    } catch (err: any) {
      setError(err.message || "Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-green-600">
          🧪 SMS API Test
        </h1>

        {/* Phone Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Номер телефона
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+77771234567"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
          />
        </div>

        {/* Send SMS Button */}
        <button
          onClick={handleSendSMS}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg mb-4 transition"
        >
          {loading ? "Отправка..." : "📤 Отправить SMS"}
        </button>

        {/* Code Input */}
        {code && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMS Код
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-2 border border-green-300 rounded-lg bg-green-50 font-bold text-lg text-center"
            />
          </div>
        )}

        {/* Login Button */}
        {code && (
          <button
            onClick={handleLogin}
            disabled={loading || !code}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg mb-4 transition"
          >
            {loading ? "Вход..." : "🔓 Войти с кодом"}
          </button>
        )}

        {/* Results */}
        {result && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded-lg">
            <p className="text-green-700">{result}</p>
          </div>
        )}

        {/* Errors */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
          <p className="font-bold mb-2">ℹ️ Инструкция:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Введи номер телефона (или остави по умолчанию)</li>
            <li>Нажми "Отправить SMS"</li>
            <li>Код появится ниже (DEV MODE)</li>
            <li>Нажми "Войти с кодом"</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
