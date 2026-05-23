"use client";

import React, { useState, useEffect } from "react";

interface FilterState {
  orderNumber: string;
  status: string;
  customer: string;
  city: string;
  deliveryDateFrom: string;
  deliveryDateTo: string;
  orderDateFrom: string;
  orderDateTo: string;
  amountFrom: string;
  amountTo: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters?: FilterState;
  cities?: string[];
}

const DEFAULT_FILTERS: FilterState = {
  orderNumber: "",
  status: "",
  customer: "",
  city: "",
  deliveryDateFrom: "",
  deliveryDateTo: "",
  orderDateFrom: "",
  orderDateTo: "",
  amountFrom: "",
  amountTo: "",
  sortBy: "created_at",
  sortOrder: "desc",
};

export default function FilterModal({
  visible,
  onClose,
  onApply,
  initialFilters = DEFAULT_FILTERS,
  cities = ["Алматы", "Астана", "Атырау", "Актау", "Кокшетау"],
}: FilterModalProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  useEffect(() => {
    if (visible && initialFilters) {
      setFilters(initialFilters);
    }
  }, [visible, initialFilters]);

  if (!visible) return null;

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleChange = (field: keyof FilterState, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const statusOptions = [
    { value: "", label: "Все статусы" },
    { value: "pending", label: "Ожидание" },
    { value: "processing", label: "Обработка" },
    { value: "confirmed", label: "Подтверждён" },
    { value: "shipped", label: "Отправлен" },
    { value: "delivered", label: "Доставлен" },
    { value: "cancelled", label: "Отменён" },
  ];

  const sortByOptions = [
    { value: "created_at", label: "По дате заявки" },
    { value: "delivery_date", label: "По дате поставки" },
    { value: "total_amount", label: "По сумме" },
    { value: "status", label: "По статусу" },
  ];

  const formFields = (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Номер заказа
        </label>
        <input
          type="text"
          placeholder="Введите номер заказа"
          value={filters.orderNumber}
          onChange={(e) => handleChange("orderNumber", e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Статус
        </label>
        <select
          value={filters.status}
          onChange={(e) => handleChange("status", e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] focus:border-transparent transition-all"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Покупатель
        </label>
        <input
          type="text"
          placeholder="Имя или email покупателя"
          value={filters.customer}
          onChange={(e) => handleChange("customer", e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Город
        </label>
        <select
          value={filters.city}
          onChange={(e) => handleChange("city", e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] focus:border-transparent transition-all"
        >
          <option value="">Все города</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Дата поставки
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            value={filters.deliveryDateFrom}
            onChange={(e) => handleChange("deliveryDateFrom", e.target.value)}
            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] focus:border-transparent transition-all"
          />
          <input
            type="date"
            value={filters.deliveryDateTo}
            onChange={(e) => handleChange("deliveryDateTo", e.target.value)}
            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Дата заявки
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            value={filters.orderDateFrom}
            onChange={(e) => handleChange("orderDateFrom", e.target.value)}
            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] focus:border-transparent transition-all"
          />
          <input
            type="date"
            value={filters.orderDateTo}
            onChange={(e) => handleChange("orderDateTo", e.target.value)}
            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Сумма (тг)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="От"
            value={filters.amountFrom}
            onChange={(e) => handleChange("amountFrom", e.target.value)}
            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] focus:border-transparent transition-all"
          />
          <input
            type="number"
            placeholder="До"
            value={filters.amountTo}
            onChange={(e) => handleChange("amountTo", e.target.value)}
            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Сортировка
        </label>
        <select
          value={filters.sortBy}
          onChange={(e) => handleChange("sortBy", e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] focus:border-transparent transition-all"
        >
          {sortByOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Порядок
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => handleChange("sortOrder", "asc")}
            className={`flex-1 px-3 py-2.5 rounded-lg font-medium transition ${
              filters.sortOrder === "asc"
                ? "bg-[#568a56] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            ↑ По возрастанию
          </button>
          <button
            onClick={() => handleChange("sortOrder", "desc")}
            className={`flex-1 px-3 py-2.5 rounded-lg font-medium transition ${
              filters.sortOrder === "desc"
                ? "bg-[#568a56] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            ↓ По убыванию
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Центральное модальное окно */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
        <div
          className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl animate-fade-scale flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 px-6 py-5 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">
              Фильтр заказов
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {formFields}
          </div>
          <div className="sticky bottom-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 flex-shrink-0">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Сбросить
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-3 bg-[#568a56] hover:bg-[#467044] text-white font-medium rounded-lg transition-colors"
            >
              Применить
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-scale { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-fade-scale { animation: fade-scale 0.3s ease-out; }
      `}</style>
    </>
  );
}
