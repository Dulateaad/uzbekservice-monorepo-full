"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { RefreshCw, Settings } from "lucide-react";

interface AnalyticsCardProps {
  label: string;
  value: number;
  suffix?: string;
}

const AnalyticsCard = ({ label, value, suffix = "" }: AnalyticsCardProps) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <p className="text-sm text-gray-600 mb-1">{label}</p>
    <p className="text-2xl font-bold text-gray-900">
      {value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
      {suffix}
    </p>
  </div>
);

interface WorkerCommission {
  worker_id: number;
  worker_name: string;
  G: number;
  D: number;
  Result: number;
}

interface CommissionData {
  success: boolean;
  truckId: string;
  city: string;
  analytics: {
    A: number;
    B: number;
    V: number;
    E: number;
  };
  workers: WorkerCommission[];
  edgeCaseTriggered?: boolean;
  message?: string;
}

interface TruckOption {
  truck_id: string;
  truck_identifier: string;
}

export default function AdminShiftsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null);
  const [trucks, setTrucks] = useState<TruckOption[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"Result" | "D" | "G">("Result");
  const [sortDesc, setSortDesc] = useState(true);
  const [basePercent, setBasePercent] = useState(3);
  const [showPercentModal, setShowPercentModal] = useState(false);
  const [tempPercent, setTempPercent] = useState("3");

  useEffect(() => {
    const loadTrucks = async () => {
      try {
        if (!isAdmin) {
          setLoading(false);
          return;
        }

        const response = await api.getAllCommissions("admin");
        if (response.success && response.combinations) {
          const truckList: TruckOption[] = response.combinations.map((c: any) => ({
            truck_id: String(c.truck_id),
            truck_identifier: String(c.truck_identifier || `Грузовик #${c.truck_id}`),
          }));
          setTrucks(truckList);
          if (truckList.length > 0) {
            setSelectedTruck(truckList[0].truck_id);
          }
        }
      } catch (error) {
        console.error("Error loading trucks:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTrucks();
  }, [isAdmin]);

  const loadCommission = useCallback(async () => {
    if (!selectedTruck) return;
    try {
      setLoading(true);
      const response = await api.getCommissionByTruckCity(
        selectedTruck,
        "ALL",
        undefined,
        "admin",
        basePercent,
      );
      if (response.success) {
        setCommissionData(response);
      } else {
        setCommissionData(null);
      }
    } catch (error) {
      console.error("Error loading commission data:", error);
      setCommissionData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTruck, basePercent]);

  useEffect(() => {
    loadCommission();
  }, [loadCommission]);

  const sortedWorkers = commissionData?.workers
    ? [...commissionData.workers].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortDesc ? bVal - aVal : aVal - bVal;
      })
    : [];

  const selectedTruckLabel =
    trucks.find((t) => t.truck_id === selectedTruck)?.truck_identifier || "";

  const fmt = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <DashboardLayout title="Комиссии сотрудников">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Комиссии сотрудников
            </h1>
            <p className="text-gray-600">
              Расчёт бонусов по грузовику (все города)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadCommission}
              disabled={loading || !selectedTruck}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Обновить
            </button>
            <button
              onClick={() => {
                setTempPercent(String(basePercent));
                setShowPercentModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Settings className="w-4 h-4" />
              Базовый процент менеджера
            </button>
          </div>
        </div>

        {/* Percent modal */}
        {showPercentModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">Базовый процент менеджера</h3>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={tempPercent}
                onChange={(e) => setTempPercent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPercentModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    setBasePercent(Number(tempPercent) || 3);
                    setShowPercentModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Применить
                </button>
              </div>
            </div>
          </div>
        )}

        {trucks.length > 0 && (
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Выберите грузовик:
            </label>
            <select
              value={selectedTruck ?? ""}
              onChange={(e) => setSelectedTruck(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {trucks.map((truck) => (
                <option key={truck.truck_id} value={truck.truck_id}>
                  {truck.truck_identifier}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {!loading && commissionData && (
          <>
            {commissionData.edgeCaseTriggered && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  {commissionData.message}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <AnalyticsCard
                label="A - Сумма товаров"
                value={commissionData.analytics.A}
                suffix="₸"
              />
              <AnalyticsCard
                label="B - Расходы (90%)"
                value={commissionData.analytics.B}
                suffix="₸"
              />
              <AnalyticsCard
                label="V - Продажи"
                value={commissionData.analytics.V}
                suffix="₸"
              />
              <AnalyticsCard
                label="E - Прибыль"
                value={commissionData.analytics.E}
                suffix="₸"
              />
            </div>

            {sortedWorkers.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-600">
                  Нет данных о назначенных сотрудниках для этого грузовика.
                  Назначьте заказы на сотрудников на странице Заказов.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">
                          Сотрудник
                        </th>
                        <th
                          className="px-6 py-3 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            setSortBy("G");
                            setSortDesc(sortBy === "G" ? !sortDesc : true);
                          }}
                        >
                          G (Продажи) {sortBy === "G" && (sortDesc ? "↓" : "↑")}
                        </th>
                        <th
                          className="px-6 py-3 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            setSortBy("D");
                            setSortDesc(sortBy === "D" ? !sortDesc : true);
                          }}
                        >
                          D (%) {sortBy === "D" && (sortDesc ? "↓" : "↑")}
                        </th>
                        <th
                          className="px-6 py-3 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            setSortBy("Result");
                            setSortDesc(sortBy === "Result" ? !sortDesc : true);
                          }}
                        >
                          Результат {sortBy === "Result" && (sortDesc ? "↓" : "↑")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortedWorkers.map((worker) => (
                        <tr
                          key={worker.worker_id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {worker.worker_name}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">
                            {fmt(worker.G)} ₸
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">
                            {fmt(worker.D)}%
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-green-600">
                            {fmt(worker.Result)} ₸
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !commissionData && trucks.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">
              Выберите грузовик для расчёта комиссий
            </p>
          </div>
        )}

        {!loading && trucks.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">
              Нет грузовиков. Добавьте грузовик в разделе «Товары и склад».
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
