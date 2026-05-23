"use client";

import React, { useState } from "react";

interface DeliveryFormProps {
  initialCity?: string;
  initialPhone?: string;
  onSubmit: (data: {
    deliveryAddress: string;
    deliveryCity: string;
    customerPhone: string;
    customerName?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function DeliveryForm({
  initialCity = "",
  initialPhone = "",
  onSubmit,
  isSubmitting = false,
}: DeliveryFormProps) {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState(initialCity);
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validatePhone = (value: string): boolean => {
    const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/;
    return phoneRegex.test(value.replace(/\s/g, ""));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!address.trim()) {
      newErrors.address = "Адрес доставки не может быть пустым";
    }

    if (!city.trim()) {
      newErrors.city = "Город не может быть пустым";
    }

    if (!phone.trim()) {
      newErrors.phone = "Номер телефона не может быть пустым";
    } else if (!validatePhone(phone)) {
      newErrors.phone = "Некорректный номер телефона";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        deliveryAddress: address.trim(),
        deliveryCity: city.trim(),
        customerPhone: phone.trim(),
        customerName: name.trim() || null,
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ФИО */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          ФИО (опционально)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ваше полное имя"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] transition"
          disabled={isSubmitting}
        />
      </div>

      {/* Адрес доставки */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Адрес доставки *
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (errors.address) {
              setErrors({ ...errors, address: "" });
            }
          }}
          placeholder="Введите адрес доставки"
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${
            errors.address
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-[#568a56]"
          }`}
          disabled={isSubmitting}
        />
        {errors.address && (
          <p className="text-red-600 text-sm mt-1">{errors.address}</p>
        )}
      </div>

      {/* Город */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Город *
        </label>
        <input
          type="text"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            if (errors.city) {
              setErrors({ ...errors, city: "" });
            }
          }}
          placeholder="Выбранный город"
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${
            errors.city
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-[#568a56]"
          }`}
          disabled={isSubmitting}
        />
        {errors.city && (
          <p className="text-red-600 text-sm mt-1">{errors.city}</p>
        )}
      </div>

      {/* Номер телефона */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Номер телефона *
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (errors.phone) {
              setErrors({ ...errors, phone: "" });
            }
          }}
          placeholder="+7 (700) 000-0000"
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${
            errors.phone
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-[#568a56]"
          }`}
          disabled={isSubmitting}
        />
        {errors.phone && (
          <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">
          Формат: +7 (700) 000-0000 или аналогичный
        </p>
      </div>

      {/* Кнопка отправки */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-[#568a56] hover:bg-[#457245] disabled:bg-gray-400 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Подтверждение...
          </>
        ) : (
          "✓ Подтвердить заказ"
        )}
      </button>
    </form>
  );
}
