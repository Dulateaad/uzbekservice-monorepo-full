"use client";

import React, { useState } from "react";
import {
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Truck as TruckIcon,
} from "lucide-react";

interface Truck {
  id: string;
  identifier: string;
  arrival_date: string;
  status: string;
}

interface TruckTabsProps {
  trucks: Truck[];
  activeTruckId: string | null;
  onSelectTruck: (truckId: string) => void;
  onCreateTruck: () => void;
  onDeleteTruck: (truckId: string) => void;
  totalCost?: number;
  canDeleteTruck?: boolean;
  canCreateTruck?: boolean;
}

export default function TruckTabs({
  trucks,
  activeTruckId,
  onSelectTruck,
  onCreateTruck,
  onDeleteTruck,
  totalCost = 0,
  canDeleteTruck = true,
  canCreateTruck = true,
}: TruckTabsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [showAllTrucks, setShowAllTrucks] = useState(false);

  const activeTruck = trucks.find((t) => t.id === activeTruckId);
  const activeIndex = trucks.findIndex((t) => t.id === activeTruckId);

  const handlePrevious = () => {
    if (activeIndex > 0) {
      onSelectTruck(trucks[activeIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (activeIndex < trucks.length - 1) {
      onSelectTruck(trucks[activeIndex + 1].id);
    }
  };

  return (
    <div className="space-y-4 w-full px-4">
      {trucks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <TruckIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 mb-6">Партий товаров ещё не создано</p>
          {canCreateTruck && (
            <button
              onClick={onCreateTruck}
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#568a56] hover:bg-[#457245] text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Создать первую партию
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Улучшенный header с информацией партии */}
          {activeTruck && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              {/* Верхняя секция - информация партии */}
              <div className="px-6 py-4 bg-gradient-to-r from-white to-gray-50/50">
                <div className="flex items-start justify-between gap-3">
                  {/* Левая часть - информация */}
                  <div className="flex-1 min-w-0">
                    {/* Номер партии */}
                    <div className="text-xs text-gray-400 mb-1.5">
                      Партия №{activeIndex + 1} из {trucks.length}
                    </div>

                    {/* Название партии - сильное выделение */}
                    <h2 className="text-xl font-bold text-gray-900 leading-tight truncate mb-1">
                      {activeTruck.identifier}
                    </h2>

                    {/* Дата доставки - вторичный текст */}
                    <div className="text-sm text-gray-500">
                      Доставка:{" "}
                      <span className="text-gray-700 font-medium">
                        {new Date(activeTruck.arrival_date).toLocaleDateString(
                          "ru",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Правая часть - кнопка удаления */}
                  {canDeleteTruck && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(activeTruck.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50/50 rounded-lg transition-all duration-200 flex-shrink-0"
                      title="Удалить партию"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Нижняя секция - управление */}
              <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100 flex items-center gap-3">
                {/* Кнопки навигации */}
                <button
                  onClick={handlePrevious}
                  disabled={activeIndex <= 0}
                  className="p-2.5 text-gray-600 bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-white hover:border-gray-300 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#F9FAFB] disabled:hover:border-[#E5E7EB] disabled:hover:text-gray-600 transition-all duration-150 rounded-lg"
                  title="Предыдущая партия"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={handleNext}
                  disabled={activeIndex >= trucks.length - 1}
                  className="p-2.5 text-gray-600 bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-white hover:border-gray-300 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#F9FAFB] disabled:hover:border-[#E5E7EB] disabled:hover:text-gray-600 transition-all duration-150 rounded-lg"
                  title="Следующая партия"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Разделитель */}
                <div className="w-px h-5 bg-gray-200 mx-2" />

                {/* Разширяемое пространство */}
                <div className="flex-1" />

                {/* Кнопка Все партии - outline */}
                <button
                  onClick={() => setShowAllTrucks(!showAllTrucks)}
                  className="px-4 py-2.5 text-sm text-gray-700 bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-white hover:border-gray-300 hover:text-gray-900 font-medium rounded-lg transition-all duration-150"
                >
                  Все партии
                </button>

                {/* Кнопка создания - primary */}
                {canCreateTruck && (
                  <button
                    onClick={onCreateTruck}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm bg-[#568a56] hover:bg-[#457245] text-white font-semibold rounded-lg transition-all duration-150 shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Новая партия
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Сетка всех партий - скрытая по умолчанию */}
          {showAllTrucks && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="text-sm font-semibold text-gray-900 mb-4 px-2">
                Список
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 max-h-40 overflow-y-auto">
                {trucks.map((truck, index) => (
                  <button
                    key={truck.id}
                    onClick={() => onSelectTruck(truck.id)}
                    className={`p-3 rounded-lg transition-all text-center text-xs ${
                      activeTruckId === truck.id
                        ? "bg-[#568a56] text-white shadow-md ring-2 ring-[#568a56] ring-offset-0"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-150 border border-transparent hover:border-gray-200"
                    }`}
                    title={`${truck.identifier} - ${new Date(truck.arrival_date).toLocaleDateString("ru")}`}
                  >
                    <div className="font-semibold truncate">
                      {truck.identifier}
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        activeTruckId === truck.id
                          ? "text-green-100"
                          : "text-gray-500"
                      }`}
                    >
                      {new Date(truck.arrival_date).toLocaleDateString("ru", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirm delete modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Удалить партию?
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              При удалении партии все товары в ней будут также удалены. Это
              действие не может быть отменено.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onDeleteTruck(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
