"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api-client";

// Available cities from main page header
const DEFAULT_CITIES = ["Алматы", "Шымкент", "Астана"];

interface CityStats {
  city: string;
  orders: number;
}

interface CityAnalytics {
  city: string;
  orders_count: number;
  total_quantity: number;
  total_revenue: number;
  total_discounts: number;
  total_returns: number;
  total_sum: number;
}

interface Truck {
  id: string;
  identifier: string;
  arrival_date: string;
  status: string;
}

export default function WorkerSettings() {
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // City analytics state
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [analytics, setAnalytics] = useState<CityAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Cities management state
  const [availableCities, setAvailableCities] =
    useState<string[]>(DEFAULT_CITIES);
  const [newCityName, setNewCityName] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [showCityManagement, setShowCityManagement] = useState(false);

  // Collapsible states
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [isTruckAnalyticsOpen, setIsTruckAnalyticsOpen] = useState(false);

  // Truck analytics state
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");
  const [analyticsStartDate, setAnalyticsStartDate] = useState<string>("");
  const [analyticsEndDate, setAnalyticsEndDate] = useState<string>("");
  const [truckAnalytics, setTruckAnalytics] = useState<any>(null);
  const [truckAnalyticsLoading, setTruckAnalyticsLoading] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadAllData();
    loadCitiesFromStorage();
  }, []);

  const loadCitiesFromStorage = () => {
    const savedCities = localStorage.getItem("availableCities");
    if (savedCities) {
      try {
        const cities = JSON.parse(savedCities);
        setAvailableCities(cities);
      } catch (err) {
        console.error("Error loading cities from storage:", err);
        setAvailableCities(DEFAULT_CITIES);
      }
    }
  };

  const saveCitiesToStorage = (cities: string[]) => {
    localStorage.setItem("availableCities", JSON.stringify(cities));
  };

  const addNewCity = () => {
    if (!newCityName.trim()) {
      setError("Введите название города");
      return;
    }

    if (availableCities.includes(newCityName.trim())) {
      setError("Такой город уже существует");
      return;
    }

    const updatedCities = [...availableCities, newCityName.trim()];
    setAvailableCities(updatedCities);
    saveCitiesToStorage(updatedCities);
    setNewCityName("");
    setError(null);

    // Notify other components about the change
    window.dispatchEvent(
      new CustomEvent("citiesUpdated", { detail: updatedCities }),
    );
  };

  const deleteCity = (cityToDelete: string) => {
    if (availableCities.length <= 1) {
      setError("Нельзя удалить последний город");
      setShowDeleteConfirm(null);
      return;
    }

    const updatedCities = availableCities.filter(
      (city) => city !== cityToDelete,
    );
    setAvailableCities(updatedCities);
    saveCitiesToStorage(updatedCities);
    setShowDeleteConfirm(null);

    // If deleted city was selected, clear selection
    if (selectedCity === cityToDelete) {
      setSelectedCity("");
      setAnalytics(null);
    }

    // Notify other components about the change
    window.dispatchEvent(
      new CustomEvent("citiesUpdated", { detail: updatedCities }),
    );
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [cityStatsRaw, trucksResponse] = await Promise.all([
        api.getAdminCityStats(),
        api.getAllTrucks(),
      ]);

      setCityStats(Array.isArray(cityStatsRaw) ? cityStatsRaw : []);
      let trucksList: Truck[] = [];
      if (
        trucksResponse &&
        typeof trucksResponse === "object" &&
        "data" in trucksResponse &&
        Array.isArray((trucksResponse as { data: Truck[] }).data)
      ) {
        trucksList = (trucksResponse as { data: Truck[] }).data;
      } else if (Array.isArray(trucksResponse)) {
        trucksList = trucksResponse as Truck[];
      }
      setTrucks(trucksList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsForCity = async (city: string) => {
    if (!city) return;

    try {
      setAnalyticsLoading(true);
      setError(null);

      const data = await api.getCityAnalyticsAdmin(
        city,
        startDate || undefined,
        endDate || undefined,
      );
      if (!data) throw new Error("Не удалось загрузить аналитику");
      setAnalytics(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка загрузки аналитики",
      );
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchTruckAnalytics = async () => {
    if (!selectedTruckId || !analyticsStartDate || !analyticsEndDate) {
      setError("Выберите фуру и даты");
      return;
    }

    try {
      setTruckAnalyticsLoading(true);
      setError(null);

      const response = await api.getTruckSalesAnalytics(
        selectedTruckId,
        analyticsStartDate,
        analyticsEndDate,
      );

      setTruckAnalytics(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка загрузки аналитики фуры",
      );
    } finally {
      setTruckAnalyticsLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 30, color: "#333" }}>Панель работника</h1>

      {error && (
        <div
          style={{
            backgroundColor: "#ffebee",
            color: "#c62828",
            padding: 15,
            borderRadius: 4,
            marginBottom: 20,
            border: "1px solid #ffcdd2",
          }}
        >
          {error}
        </div>
      )}

      {/* City Analytics */}
      <section style={{ marginBottom: 20 }}>
        <button
          onClick={() => setIsCityOpen(!isCityOpen)}
          style={{
            width: "100%",
            padding: "10px 15px",
            backgroundColor: "#f0f0f0",
            border: "1px solid #ccc",
            borderRadius: 4,
            textAlign: "left",
            cursor: "pointer",
            fontSize: 18,
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Анализ по городам
          <span
            style={{
              transform: isCityOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          >
            ▼
          </span>
        </button>
        {isCityOpen && (
          <div
            style={{
              marginTop: 10,
              padding: 15,
              backgroundColor: "#f9f9f9",
              borderRadius: 4,
              border: "1px solid #ddd",
            }}
          >
            {/* City Management Button */}
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setShowCityManagement(true)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                Управление городами
              </button>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 15 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 5,
                    fontWeight: "bold",
                    fontSize: 14,
                  }}
                >
                  Выберите город:
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    const newCity = e.target.value;
                    setSelectedCity(newCity);
                    setAnalytics(null);
                    if (newCity) {
                      // Автоматически загружаем аналитику при выборе города
                      fetchAnalyticsForCity(newCity);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">-- Выберите город --</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 15,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 5,
                      fontWeight: "bold",
                      fontSize: 14,
                    }}
                  >
                    Дата начала:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 4,
                      border: "1px solid #ccc",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 5,
                      fontWeight: "bold",
                      fontSize: 14,
                    }}
                  >
                    Дата окончания:
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 4,
                      border: "1px solid #ccc",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => fetchAnalyticsForCity(selectedCity)}
                disabled={!selectedCity || analyticsLoading}
                style={{
                  padding: "10px 20px",
                  backgroundColor:
                    selectedCity && !analyticsLoading ? "#4CAF50" : "#cccccc",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor:
                    selectedCity && !analyticsLoading
                      ? "pointer"
                      : "not-allowed",
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                {analyticsLoading ? "Загрузка..." : "Показать аналитику"}
              </button>
            </div>

            {/* Analytics Display */}
            {analytics && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ marginBottom: 15, color: "#333" }}>
                  Аналитика для города: {selectedCity}
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 15,
                  }}
                >
                  <div
                    style={{
                      padding: 15,
                      backgroundColor: "#e3f2fd",
                      borderRadius: 4,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: "#666", marginBottom: 5 }}
                    >
                      Количество заказов
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: "bold",
                        color: "#1976D2",
                      }}
                    >
                      {analytics.orders_count}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 15,
                      backgroundColor: "#f3e5f5",
                      borderRadius: 4,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: "#666", marginBottom: 5 }}
                    >
                      Общее количество
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: "bold",
                        color: "#7B1FA2",
                      }}
                    >
                      {analytics.total_quantity}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 15,
                      backgroundColor: "#e8f5e8",
                      borderRadius: 4,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: "#666", marginBottom: 5 }}
                    >
                      Выручка (₸)
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: "bold",
                        color: "#388E3C",
                      }}
                    >
                      {analytics.total_revenue.toLocaleString("ru-RU", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 15,
                      backgroundColor: "#fff3e0",
                      borderRadius: 4,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: "#666", marginBottom: 5 }}
                    >
                      Скидки (₸)
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: "bold",
                        color: "#F57C00",
                      }}
                    >
                      {analytics.total_discounts.toLocaleString("ru-RU", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 15,
                      backgroundColor: "#ffebee",
                      borderRadius: 4,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: "#666", marginBottom: 5 }}
                    >
                      Возвраты (₸)
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: "bold",
                        color: "#D32F2F",
                      }}
                    >
                      {analytics.total_returns.toLocaleString("ru-RU", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 15,
                      backgroundColor: "#f5f5f5",
                      borderRadius: 4,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: "#666", marginBottom: 5 }}
                    >
                      Общая сумма (₸)
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: "bold",
                        color: "#424242",
                      }}
                    >
                      {analytics.total_sum.toLocaleString("ru-RU", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* City Stats Table */}
            <div>
              <h3 style={{ marginBottom: 15, color: "#333" }}>
                Статистика заказов по городам
              </h3>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  backgroundColor: "white",
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th
                      style={{
                        padding: 12,
                        textAlign: "left",
                        borderBottom: "1px solid #ddd",
                        fontWeight: "bold",
                      }}
                    >
                      Город
                    </th>
                    <th
                      style={{
                        padding: 12,
                        textAlign: "right",
                        borderBottom: "1px solid #ddd",
                        fontWeight: "bold",
                      }}
                    >
                      Заказы
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cityStats.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        style={{
                          padding: 20,
                          textAlign: "center",
                          color: "#666",
                        }}
                      >
                        Нет данных
                      </td>
                    </tr>
                  ) : (
                    cityStats.map((city) => (
                      <tr
                        key={city.city}
                        style={{
                          borderBottom: "1px solid #ddd",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedCity(city.city)}
                      >
                        <td>{city.city}</td>
                        <td style={{ textAlign: "right" }}>{city.orders}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Truck Analytics */}
      <section>
        <button
          onClick={() => setIsTruckAnalyticsOpen(!isTruckAnalyticsOpen)}
          style={{
            width: "100%",
            padding: "10px 15px",
            backgroundColor: "#f0f0f0",
            border: "1px solid #ccc",
            borderRadius: 4,
            textAlign: "left",
            cursor: "pointer",
            fontSize: 18,
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Аналитика продаж фур
          <span
            style={{
              transform: isTruckAnalyticsOpen
                ? "rotate(180deg)"
                : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          >
            ▼
          </span>
        </button>
        {isTruckAnalyticsOpen && (
          <div
            style={{
              marginTop: 10,
              padding: 15,
              backgroundColor: "#f9f9f9",
              borderRadius: 4,
              border: "1px solid #ddd",
            }}
          >
            {/* Truck Selection */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 5,
                  fontWeight: "bold",
                  fontSize: 14,
                }}
              >
                Выберите фуру:
              </label>
              <select
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              >
                <option value="">-- Выберите фуру --</option>
                {trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.identifier} - {truck.status}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 5,
                    fontWeight: "bold",
                    fontSize: 14,
                  }}
                >
                  Дата начала:
                </label>
                <input
                  type="date"
                  value={analyticsStartDate}
                  onChange={(e) => setAnalyticsStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 5,
                    fontWeight: "bold",
                    fontSize: 14,
                  }}
                >
                  Дата окончания:
                </label>
                <input
                  type="date"
                  value={analyticsEndDate}
                  onChange={(e) => setAnalyticsEndDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Auto-fill dates button */}
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date(today);
                  lastMonth.setMonth(today.getMonth() - 1);

                  setAnalyticsStartDate(lastMonth.toISOString().split("T")[0]);
                  setAnalyticsEndDate(today.toISOString().split("T")[0]);
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#FF9800",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                  marginRight: 10,
                }}
              >
                Автозаполнение дат (последний месяц)
              </button>

              <button
                onClick={fetchTruckAnalytics}
                disabled={
                  !selectedTruckId ||
                  !analyticsStartDate ||
                  !analyticsEndDate ||
                  truckAnalyticsLoading
                }
                style={{
                  padding: "10px 20px",
                  backgroundColor:
                    !selectedTruckId ||
                    !analyticsStartDate ||
                    !analyticsEndDate ||
                    truckAnalyticsLoading
                      ? "#cccccc"
                      : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor:
                    !selectedTruckId ||
                    !analyticsStartDate ||
                    !analyticsEndDate ||
                    truckAnalyticsLoading
                      ? "not-allowed"
                      : "pointer",
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                {truckAnalyticsLoading ? "Загрузка..." : "Показать аналитику"}
              </button>
            </div>

            {/* Truck Analytics Display */}
            {truckAnalytics && (
              <div>
                <h3 style={{ marginBottom: 15, color: "#333" }}>
                  Аналитика продаж для фуры:{" "}
                  {trucks.find((t) => t.id === selectedTruckId)?.identifier}
                </h3>

                {/* Summary Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 15,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      padding: 15,
                      backgroundColor: "#e3f2fd",
                      borderRadius: 4,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: "#666", marginBottom: 5 }}
                    >
                      Всего товаров
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        color: "#1976D2",
                      }}
                    >
                      {truckAnalytics.total_items || 0}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 15,
                      backgroundColor: "#e8f5e8",
                      borderRadius: 4,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: "#666", marginBottom: 5 }}
                    >
                      Продано
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        color: "#388E3C",
                      }}
                    >
                      {truckAnalytics.total_sold || 0}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 15,
                      backgroundColor: "#fff3e0",
                      borderRadius: 4,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: "#666", marginBottom: 5 }}
                    >
                      Остаток
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        color: "#F57C00",
                      }}
                    >
                      {truckAnalytics.total_remaining || 0}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 15,
                      backgroundColor: "#f5f5f5",
                      borderRadius: 4,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: "#666", marginBottom: 5 }}
                    >
                      Процент продаж
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        color: "#424242",
                      }}
                    >
                      {truckAnalytics.sales_percentage || 0}%
                    </div>
                  </div>
                </div>

                {/* Detailed Table */}
                {truckAnalytics.items && truckAnalytics.items.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 15, color: "#333" }}>
                      Детальная информация по товарам
                    </h4>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          backgroundColor: "white",
                          borderRadius: 4,
                          overflow: "hidden",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#f5f5f5" }}>
                            <th
                              style={{
                                padding: 12,
                                textAlign: "left",
                                borderBottom: "1px solid #ddd",
                                fontWeight: "bold",
                              }}
                            >
                              Товар
                            </th>
                            <th
                              style={{
                                padding: 12,
                                textAlign: "right",
                                borderBottom: "1px solid #ddd",
                                fontWeight: "bold",
                              }}
                            >
                              Всего
                            </th>
                            <th
                              style={{
                                padding: 12,
                                textAlign: "right",
                                borderBottom: "1px solid #ddd",
                                fontWeight: "bold",
                              }}
                            >
                              Продано до даты
                            </th>
                            <th
                              style={{
                                padding: 12,
                                textAlign: "right",
                                borderBottom: "1px solid #ddd",
                                fontWeight: "bold",
                              }}
                            >
                              Процент продаж
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {truckAnalytics.items.map(
                            (item: any, index: number) => (
                              <tr
                                key={index}
                                style={{
                                  borderBottom: "1px solid #ddd",
                                }}
                              >
                                <td style={{ padding: 12 }}>
                                  {item.name}
                                  {item.variety && ` (${item.variety})`}
                                </td>
                                <td style={{ textAlign: "right", padding: 12 }}>
                                  {item.total_ever}
                                </td>
                                <td style={{ textAlign: "right", padding: 12 }}>
                                  {item.sold_before_date}
                                </td>
                                <td style={{ textAlign: "right", padding: 12 }}>
                                  {item.sales_percentage}%
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* City Management Modal */}
      {showCityManagement && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 8,
              maxWidth: 500,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ marginBottom: 20 }}>Управление городами</h3>

            {/* Add City */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 10 }}>Добавить город</h4>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="Название города"
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                  }}
                />
                <button
                  onClick={addNewCity}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Добавить
                </button>
              </div>
            </div>

            {/* Cities List */}
            <div>
              <h4 style={{ marginBottom: 10 }}>Существующие города</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {availableCities.map((city) => (
                  <div
                    key={city}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 10px",
                      backgroundColor: "#f5f5f5",
                      borderRadius: 4,
                    }}
                  >
                    <span>{city}</span>
                    <button
                      onClick={() => setShowDeleteConfirm(city)}
                      style={{
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        borderRadius: 50,
                        width: 20,
                        height: 20,
                        cursor: "pointer",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button
                onClick={() => setShowCityManagement(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#666",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 8,
              maxWidth: 400,
              width: "90%",
            }}
          >
            <h3 style={{ marginBottom: 15 }}>Подтверждение удаления</h3>
            <p style={{ marginBottom: 20 }}>
              Вы уверены, что хотите удалить город "{showDeleteConfirm}"?
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#666",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Отмена
              </button>
              <button
                onClick={() => deleteCity(showDeleteConfirm)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
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
