"use client";

import React, { JSX, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { DashboardLayout } from "@/components/dashboard-layout";

interface AnalyticsCard {
  label: string;
  value: number;
  suffix: string;
  color?: string; // tailwind bg color for card
  icon?: React.ReactNode;
}

interface WorkerRow {
  worker_id: number;
  worker_name: string;
  G: number;
  D: number;
  L: number;
  Result: number;
}

interface CommissionResponse {
  success: boolean;
  truckId: number;
  city: string;
  analytics: {
    A: number;
    B: number;
    V: number;
    E: number;
    refunds?: number;
    netEarned?: number;
    soldItems?: number;
    deliveredOrdersCount?: number;
    refundCount?: number;
  };
  workers: WorkerRow[];
  edgeCaseTriggered?: boolean;
  message?: string;
}

interface TruckOption {
  truck_id: number;
  city: string;
  identifier?: string; // filled from trucks table for better labels
}

const AnalyticsCardComponent = ({
  label,
  value,
  suffix,
  color = "bg-white",
  icon,
}: AnalyticsCard) => (
  <div
    className={`${color} border border-gray-200 rounded-lg p-6 shadow-sm flex items-center`}
  >
    {icon && <div className="mr-4 text-2xl text-gray-500">{icon}</div>}
    <div>
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <p className="text-3xl font-bold text-gray-900">
        {value.toFixed(2)}
        <span className="text-lg ml-1 text-gray-500">{suffix}</span>
      </p>
    </div>
  </div>
);

interface NavItem {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
  count?: number;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/orders", label: "Заказы", icon: "orders" },
  { href: "/admin/shifts", label: "Смена", icon: "shifts", active: true },
  { href: "/admin/users", label: "Контрагенты", icon: "users", count: 0 },
  { href: "/admin/inventory", label: "Склад / Остатки", icon: "inventory" },
  { href: "/admin/settings", label: "Настройки", icon: "settings" },
];

const renderNavIcon = (iconName: string) => {
  const iconProps = {
    className: "w-5 h-5",
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
  };
  switch (iconName) {
    case "orders":
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case "shifts":
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "users":
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 8.646 4 4 0 010-8.646zm0 0a5 5 0 100 10 5 5 0 000-10z"
          />
        </svg>
      );
    case "preorders":
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case "inventory":
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      );
    default:
      return null;
  }
};

export default function ShiftsCommissionsPage({
  role,
}: {
  role: "admin" | "worker";
}) {
  const { user } = useAuth();
  const router = useRouter();

  // Determine if user is admin or worker
  const isAdmin = role === "admin";
  const isWorker = role === "worker";

  // State
  const [loading, setLoading] = useState(true);
  const [trucks, setTrucks] = useState<TruckOption[]>([]); // full truck list from DB
  const [selectedTruck, setSelectedTruck] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [commissionData, setCommissionData] =
    useState<CommissionResponse | null>(null);
  const [sortBy, setSortBy] = useState<"Result" | "G" | "D" | "L">("Result");
  const [sortDesc, setSortDesc] = useState(true);
  // states for percent modal removed; every worker is always shown
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [baseManagerPercent, setBaseManagerPercent] = useState<number>(3);
  const [isPercentDialogOpen, setIsPercentDialogOpen] = useState(false);
  const [percentInput, setPercentInput] = useState<string>("3");

  // Sync base percent with admin settings stored in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("baseManagerPercent");
    const parsed = saved ? parseFloat(saved) : NaN;
    if (!isNaN(parsed)) {
      setBaseManagerPercent(parsed);
      setPercentInput(parsed.toString());
    }

    const onBasePercentUpdated = (event: any) => {
      const percent = event?.detail?.percent;
      if (typeof percent === "number" && !isNaN(percent)) {
        setBaseManagerPercent(percent);
        setPercentInput(percent.toString());
      }
    };

    window.addEventListener("baseManagerPercentUpdated", onBasePercentUpdated);
    return () => {
      window.removeEventListener(
        "baseManagerPercentUpdated",
        onBasePercentUpdated,
      );
    };
  }, []);

  // Процент комиссии — только локально (как в настройках), без REST
  useEffect(() => {
    const saved = localStorage.getItem("baseManagerPercent");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) {
        setBaseManagerPercent(parsed);
        setPercentInput(parsed.toString());
      }
    }
  }, []);

  const saveBaseManagerPercent = async (percent: number) => {
    localStorage.setItem("baseManagerPercent", percent.toString());
    setBaseManagerPercent(percent);
    setPercentInput(percent.toString());
    window.dispatchEvent(
      new CustomEvent("baseManagerPercentUpdated", { detail: { percent } }),
    );
  };

  const [inventoryTotal, setInventoryTotal] = useState<number>(0); // остатки товаров
  const [deliveredOrdersTotal, setDeliveredOrdersTotal] = useState<number>(0); // продано
  const [refundsTotal, setRefundsTotal] = useState<number>(0); // возвраты

  // Load trucks on mount (admin) or redirect if not authorized
  useEffect(() => {
    if (!isAdmin && !isWorker) {
      router.push("/auth/login");
      return;
    }

    const loadTrucks = async () => {
      try {
        setLoading(true);

        // Get full truck list from DB
        const trucksResp: any = await api.getAllTrucks();
        const trucksList = Array.isArray(trucksResp?.data)
          ? trucksResp.data
          : [];

        // map full truck list for selector
        const allTrucks: TruckOption[] = trucksList.map((t: any) => ({
          truck_id: t.id,
          city: t.city || "",
          identifier: t.identifier || `#${t.id}`,
        }));

        setTrucks(allTrucks);

        // choose default truck and use ALL cities
        if (allTrucks.length > 0) {
          setSelectedTruck(allTrucks[0].truck_id.toString());
        }
        setSelectedCity("ALL");
      } catch (error) {
        console.error("Error loading trucks:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTrucks();
  }, [isAdmin, isWorker, router, user?.id]);

  // helper to fetch all relevant metrics
  const fetchCommissionData = useCallback(async () => {
    if (!selectedTruck || !selectedCity) return;
    try {
      setLoading(true);
      const response = await api.getCommissionByTruckCity(
        selectedTruck as unknown as number,
        selectedCity,
        isWorker ? user?.id : undefined,
        isAdmin ? "admin" : "worker",
        baseManagerPercent,
      );

      if (response.success) {
        console.log("Commission data loaded:", response);
        setCommissionData(response);
      } else {
        console.log("Commission data error, response:", response);
      }

      // Load inventory total (остатки)
      try {
        const inventoryResp = await api.getTruckAllGoodsTotal(selectedTruck);
        if (inventoryResp.success) {
          setInventoryTotal(inventoryResp.allGoodsTotal ?? 0);
        }
      } catch (err) {
        console.error("Error loading all goods total:", err);
      }

      // Load delivered orders total (продано)
      try {
        const deliveredResp = await api.getTruckDeliveredOrdersTotal(
          selectedTruck,
          selectedCity,
        );
        if (deliveredResp.success) {
          setDeliveredOrdersTotal(deliveredResp.totalSales ?? 0);
        }
      } catch (err) {
        console.error("Error loading delivered orders total:", err);
      }

      // Load refunds total (возвраты)
      try {
        const refundsResp = await api.getTruckRefundsTotal(
          selectedTruck,
          selectedCity,
        );
        if (refundsResp.success) {
          setRefundsTotal(refundsResp.refundAmount ?? 0);
        }
      } catch (err) {
        console.error("Error loading refunds total:", err);
      }
    } catch (error) {
      console.error("Error loading commission data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    selectedTruck,
    selectedCity,
    isWorker,
    isAdmin,
    user?.id,
    baseManagerPercent,
  ]);
  // Listen for order status updates so we can refresh immediately
  useEffect(() => {
    const handler = (_ev: Event) => {
      // could examine details if needed
      if (selectedTruck && selectedCity) {
        fetchCommissionData();
      }
    };
    window.addEventListener("order:statusChanged", handler);
    return () => window.removeEventListener("order:statusChanged", handler);
  }, [selectedTruck, selectedCity, fetchCommissionData]);
  // Load commission data when truck/city changes
  useEffect(() => {
    fetchCommissionData();
  }, [fetchCommissionData]);
  // Автоматическое обновление данных каждые 30 секунд
  useEffect(() => {
    if (!selectedTruck || !selectedCity) return;
    const interval = setInterval(() => {
      fetchCommissionData();
    }, 30000); // 30 секунд

    return () => clearInterval(interval);
  }, [selectedTruck, selectedCity, fetchCommissionData]);
  // Sort workers
  // (no truck filter needed once search removed)
  const filteredTrucks = trucks;

  const sortedWorkers = commissionData?.workers
    ? [...commissionData.workers].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortDesc ? bVal - aVal : aVal - bVal;
      })
    : [];

  // Only show own worker if worker role
  const displayedWorkers = isWorker
    ? sortedWorkers.filter((w) => w.worker_id === user?.id)
    : sortedWorkers;

  const handleTruckChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedTruck(id);
    // aggregate across all cities for new truck
    setSelectedCity("ALL");
  };

  // percent-modal logic removed; all workers are always shown

  const handleSort = (column: "Result" | "G" | "D" | "L") => {
    if (sortBy === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(column);
      setSortDesc(true);
    }
  };

  return (
    <DashboardLayout title={isWorker ? "Мои комиссии" : "Комиссии сотрудников"}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isWorker ? "Мои комиссии" : "Комиссии сотрудников"}
              </h1>
              <p className="text-gray-600">
                Расчёт бонусов по грузовику (все города)
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Принудительное обновление данных
                    fetchCommissionData();
                  }}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  🔄 Обновить
                </button>
                <button
                  onClick={() => {
                    setPercentInput(baseManagerPercent.toString());
                    setIsPercentDialogOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  ⚙️ Базовый процент менеджера
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Percent Dialog */}
        {isPercentDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">
                Установить базовый процент менеджера
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Процент (%)
                  </label>
                  <input
                    type="number"
                    value={percentInput}
                    onChange={(e) => setPercentInput(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setIsPercentDialogOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      const newPercent = parseFloat(percentInput) || 3;
                      const constrained = Math.max(
                        0,
                        Math.min(100, newPercent),
                      );
                      setBaseManagerPercent(constrained);
                      localStorage.setItem(
                        "baseManagerPercent",
                        constrained.toString(),
                      );
                      window.dispatchEvent(
                        new CustomEvent("baseManagerPercentUpdated", {
                          detail: { percent: constrained },
                        }),
                      );
                      setIsPercentDialogOpen(false);
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Truck & city selectors */}
        {trucks.length > 0 && (
          <>
            <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Выберите грузовик:
              </label>
              <select
                value={selectedTruck ?? ""}
                onChange={handleTruckChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>
                  -- выберите фуру --
                </option>
                {Array.from(new Set(trucks.map((t) => t.truck_id))).map(
                  (truckId) => {
                    const opt = trucks.find((t) => t.truck_id === truckId);
                    return (
                      <option key={truckId} value={truckId.toString()}>
                        {opt?.identifier ?? `#${truckId}`}
                      </option>
                    );
                  },
                )}
              </select>
            </div>
          </>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Analytics Cards */}
        {!loading && commissionData && (
          <>
            {/* Edge case warning */}
            {commissionData.edgeCaseTriggered && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm font-medium">
                  ⚠️ {commissionData.message}
                </p>
              </div>
            )}

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <AnalyticsCardComponent
                label="Всего товаров было и есть"
                value={inventoryTotal}
                suffix="₸"
                color="bg-white"
                icon={
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7h18M3 12h18M3 17h18"
                    />
                  </svg>
                }
              />

              <AnalyticsCardComponent
                label="Продано доставленных заказов"
                value={deliveredOrdersTotal}
                suffix="₸"
                color={
                  deliveredOrdersTotal < 0.9 * inventoryTotal
                    ? "bg-yellow-50"
                    : "bg-green-50"
                }
                icon={
                  <svg
                    className="w-6 h-6 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 5m5-5v5m4-5v5m5-5l2 5"
                    />
                  </svg>
                }
              />

              <AnalyticsCardComponent
                label="Возвраты"
                value={refundsTotal}
                suffix="₸"
                color="bg-red-50"
                icon={
                  <svg
                    className="w-6 h-6 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h13M3 14h9m5 0l3-3m0 6l-3-3"
                    />
                  </svg>
                }
              />

              <AnalyticsCardComponent
                label="Доход с фуры"
                value={deliveredOrdersTotal - refundsTotal}
                suffix="₸"
                color="bg-green-50"
                icon={
                  <svg
                    className="w-6 h-6 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"
                    />
                  </svg>
                }
              />
            </div>

            {/* Workers Table */}
            {displayedWorkers.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-600">
                  {isWorker
                    ? "У вас нет продаж для этого грузовика и города"
                    : "Нет данных по выбранной фуре"}
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Имя работника
                        </th>
                        <th
                          onClick={() => handleSort("G")}
                          className="px-6 py-4 text-right text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          G — Продажи ₸{" "}
                          {sortBy === "G" && (sortDesc ? "↓" : "↑")}
                        </th>
                        <th
                          onClick={() => handleSort("D")}
                          className="px-6 py-4 text-right text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          D — Базовый %{" "}
                          {sortBy === "D" && (sortDesc ? "↓" : "↑")}
                        </th>
                        <th
                          onClick={() => handleSort("L")}
                          className="px-6 py-4 text-right text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          L — Доля % {sortBy === "L" && (sortDesc ? "↓" : "↑")}
                        </th>
                        <th
                          onClick={() => handleSort("Result")}
                          className="px-6 py-4 text-right text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          Сумма данного менеджера
                          {sortBy === "Result" && (sortDesc ? "↓" : "↑")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {displayedWorkers.map((worker) => {
                        const isExpanded = expandedRows.has(worker.worker_id);
                        return (
                          <React.Fragment key={worker.worker_id}>
                            <tr
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => {
                                const newSet = new Set(expandedRows);
                                if (isExpanded) newSet.delete(worker.worker_id);
                                else newSet.add(worker.worker_id);
                                setExpandedRows(newSet);
                              }}
                            >
                              <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center">
                                <svg
                                  className={`w-4 h-4 mr-2 transform transition-transform ${
                                    isExpanded ? "rotate-90" : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                                {worker.worker_name}
                              </td>
                              <td className="px-6 py-4 text-sm text-right text-gray-600">
                                {(worker.G ?? 0).toFixed(2)} ₸
                              </td>
                              <td className="px-6 py-4 text-sm text-right text-gray-600">
                                {((worker.D ?? 0) * 100).toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 text-sm text-right text-gray-600">
                                {(worker.L ?? 0).toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 text-sm text-right font-bold text-green-600">
                                {(worker.Result ?? 0).toFixed(2)} ₸
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-gray-50">
                                <td
                                  colSpan={5}
                                  className="px-6 py-4 text-sm text-gray-700"
                                >
                                  <div className="space-y-2">
                                    <p>
                                      <strong>Продажи:</strong>{" "}
                                      {(worker.G ?? 0).toFixed(2)} ₸
                                    </p>
                                    <p>
                                      <strong>Доля в продажах:</strong>{" "}
                                      {(worker.L ?? 0).toFixed(2)}%
                                    </p>
                                    <p className="text-green-600 font-bold">
                                      <strong>Сумма данного менеджера:</strong>{" "}
                                      {(worker.Result ?? 0).toFixed(2)} ₸
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !commissionData && trucks.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">
              Не удалось загрузить данные о комиссиях
            </p>
          </div>
        )}

        {!loading && trucks.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">Нет доступных грузовиков и городов</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
