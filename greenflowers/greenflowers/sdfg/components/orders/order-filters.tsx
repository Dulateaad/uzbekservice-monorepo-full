"use client";

import React from "react";

interface OrderFilterProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  cityFilter: string;
  onCityChange: (city: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function OrderFilters({
  statusFilter,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  cityFilter,
  onCityChange,
  sortBy,
  onSortChange,
}: OrderFilterProps) {
  const statuses = [
    { value: "all", label: "Все статусы" },
    { value: "processing", label: "🟡 В обработке" },
    { value: "shipped", label: "🔵 Отправлен" },
    { value: "delivered", label: "🟢 Доставлен" },
    { value: "cancelled", label: "🔴 Отменён" },
  ];

  const dateRanges = [
    { value: "month", label: "За месяц" },
    { value: "3months", label: "За 3 месяца" },
    { value: "year", label: "За год" },
  ];

  const sortOptions = [
    { value: "date_new", label: "Новые сверху" },
    { value: "date_old", label: "Старые сверху" },
    { value: "amount_high", label: "Дороже" },
    { value: "amount_low", label: "Дешевле" },
  ];

  const cities = [
    { value: "all", label: "Все города" },
    { value: "Алматы", label: "Алматы" },
    { value: "Астана", label: "Астана" },
    { value: "Шымкент", label: "Шымкент" },
  ];

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
      {/* Статус */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Статус
        </label>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <button
              key={status.value}
              onClick={() => onStatusChange(status.value)}
              className={`px-3 py-2 rounded-lg font-medium transition ${
                statusFilter === status.value
                  ? "bg-[#568a56] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Дата */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Период
        </label>
        <div className="flex gap-2 flex-wrap">
          {dateRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => onDateRangeChange(range.value)}
              className={`px-3 py-2 rounded-lg font-medium transition ${
                dateRange === range.value
                  ? "bg-[#568a56] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Город */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Город доставки
        </label>
        <select
          value={cityFilter}
          onChange={(e) => onCityChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56]"
        >
          {cities.map((city) => (
            <option key={city.value} value={city.value}>
              {city.label}
            </option>
          ))}
        </select>
      </div>

      {/* Сортировка */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Сортировка
        </label>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56]"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
