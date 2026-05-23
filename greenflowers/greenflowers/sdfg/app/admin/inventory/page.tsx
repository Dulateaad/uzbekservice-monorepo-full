"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { checkUserPermission } from "@/lib/auth";
import {
  notifyInventoryUpdate,
  useInventoryUpdates,
} from "@/hooks/use-delivery-sync";
import TruckTabs from "@/components/inventory/TruckTabs";
import CreateTruckModal from "@/components/inventory/CreateTruckModal";
import AddPositionModal from "@/components/inventory/AddPositionModal";
import ProductCatalogModal from "@/components/inventory/ProductCatalogModal";
import InventoryTable from "@/components/inventory/InventoryTable";
import { Plus, Search, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";

interface Truck {
  id: string;
  identifier: string;
  arrival_date: string;
  status: string;
}

interface InventoryItem {
  id: number;
  truck_id: string;
  name: string;
  variety: string;
  quantity: number;
  price: number;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

// NAV_ITEMS adapt to prefix and mimic /admin/orders order
const createNavItems = (prefix: string) => {
  const items = [
    { href: `${prefix}/orders`, label: "Заказы", icon: "orders" },
    { href: `${prefix}/shifts`, label: "Смена", icon: "shifts" },
    { href: `${prefix}/users`, label: "Контрагенты", icon: "users" },
    {
      href: `${prefix}/inventory`,
      label: "Склад / Остатки",
      icon: "inventory",
      active: true,
    },
  ];
  if (prefix === "/admin") {
    items.push({
      href: "/admin/settings",
      label: "Настройки",
      icon: "settings",
    });
  }
  return items;
};

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
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m0 0v10l8 4"
          />
        </svg>
      );
    case "settings":
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l.286.879a1 1 0 00.95.69h.995c.969 0 1.371 1.24.588 1.81l-.804.588a1 1 0 00-.364 1.118l.286.879c.3.921-.755 1.688-1.538 1.118l-.804-.588a1 1 0 00-1.176 0l-.804.588c-.783.57-1.838-.197-1.538-1.118l.286-.879a1 1 0 00-.364-1.118l-.804-.588c-.783-.57-.381-1.81.588-1.81h.995a1 1 0 00.95-.69l.286-.879z"
          />
        </svg>
      );
    default:
      return null;
  }
};

export default function AdminInventoryPage() {
  const pathname = usePathname();
  const prefix = pathname.startsWith("/employee") ? "/employee" : "/admin";
  const NAV_ITEMS = createNavItems(prefix);
  const { user, isLoading: authLoading } = useAuth();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTruckId, setActiveTruckId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [addError, setAddError] = useState("");

  // Modals
  const [showCreateTruck, setShowCreateTruck] = useState(false);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  // sorting fields
  const [sortField, setSortField] = useState<"price" | "quantity">("price");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // User permissions
  const [userPermissions, setUserPermissions] = useState({
    create_product: true,
    edit_truck: true,
    create_batch: true,
    edit_position: true,
  });

  /** Загрузка партий после готовности Firebase Auth (иначе список пустой и «пропадает» после F5). */
  const loadTrucks = useCallback(
    async (opts?: { preferTruckId?: string | null }) => {
      try {
        setLoading(true);
        const response = await api.getAllTrucks();
        console.log("Trucks API Response:", response);

        let trucksList: Truck[] = [];
        if (response?.data && Array.isArray(response.data)) {
          trucksList = response.data;
        } else if (Array.isArray(response)) {
          trucksList = response;
        } else if (
          response &&
          typeof response === "object" &&
          "success" in response &&
          (response as { success?: boolean }).success === false
        ) {
          const msg =
            (response as { error?: string }).error ||
            "Не удалось загрузить партии";
          console.error("getAllTrucks:", msg);
          setCreateError(msg);
        }

        console.log("Loaded trucks:", trucksList.length);
        setTrucks(trucksList);
        const prefer = opts?.preferTruckId;
        setActiveTruckId((prev) => {
          if (trucksList.length === 0) return null;
          if (prefer && trucksList.some((t) => t.id === prefer)) return prefer;
          if (prev && trucksList.some((t) => t.id === prev)) return prev;
          return trucksList[0].id;
        });
      } catch (error) {
        console.error("❌ Error loading trucks:", error);
        setCreateError("Ошибка загрузки партий");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;
    void loadTrucks();
  }, [authLoading, loadTrucks, user?.firebaseUid]);

  // Категории для фильтров (не зависят от партий)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.getFlowerCategories();
        if (res && Array.isArray(res)) {
          setCategories(res.map((c: any) => String(c.name || c).trim()));
          return;
        }

        if (res && res.success && Array.isArray(res.data)) {
          setCategories(res.data.map((c: any) => String(c.name || c).trim()));
          return;
        }

        const fallback = await api.getAvailableInventoryCategories();
        if (fallback && fallback.success && Array.isArray(fallback.data)) {
          setCategories(
            fallback.data.map((c: any) => String(c.name || c).trim()),
          );
        }
      } catch (e) {
        console.warn("Failed to load categories:", e);
      }
    })();
  }, []);

  // Load user permissions
  useEffect(() => {
    const loadUserPermissions = async () => {
      if (!user) return;

      // Check each permission
      const permissions = {
        create_product: await checkUserPermission(user.id, "create_product"),
        edit_truck: await checkUserPermission(user.id, "edit_truck"),
        create_batch: await checkUserPermission(user.id, "create_batch"),
        edit_position: await checkUserPermission(user.id, "edit_position"),
      };

      setUserPermissions(permissions);
      console.log("User permissions loaded:", permissions);
    };

    loadUserPermissions();
  }, [user]);

  // Load items (extracted so other listeners can call it)
  const loadItems = async (truckIdParam?: string | null) => {
    const truckIdToUse = truckIdParam ?? activeTruckId;
    if (!truckIdToUse) {
      console.log("No truckId provided to loadItems");
      return;
    }

    console.log("Loading items for truck:", truckIdToUse);
    try {
      setItemsLoading(true);
      const response = await api.getInventoryItems(truckIdToUse);
      console.log("📦 API Response:", response);

      if (response?.success && Array.isArray(response.data)) {
        console.log("Loaded items:", response.data.length);
        setItems(response.data);
      } else if (Array.isArray(response)) {
        console.log("Loaded items (array):", response.length);
        setItems(response);
      } else {
        console.log("❌ Unexpected response format:", response);
        setItems([]);
      }
    } catch (error) {
      console.error("❌ Error loading items:", error);
      setAddError("Ошибка загрузки товаров");
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeTruckId) return;
    loadItems(activeTruckId);
  }, [activeTruckId]);

  // Listen to global inventory updates (other tabs / processes)
  useInventoryUpdates(() => {
    if (activeTruckId) loadItems(activeTruckId);
  });

  // Create truck
  const handleCreateTruck = async (truckData: {
    identifier: string;
    arrival_date: string;
  }) => {
    try {
      setCreateError("");
      const response = await api.createTruck({
        ...truckData,
        status: "pending",
      });

      if (response?.success && response.data) {
        const newId = response.data.id as string;
        // Перезагрузка с сервера — надёжнее, чем [...trucks] (гонка с auth / stale state)
        await loadTrucks({ preferTruckId: newId });
      } else {
        setCreateError(response?.error || "Ошибка при создании фуры");
        throw new Error(response?.error || "Failed to create truck");
      }
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Ошибка при создании фуры",
      );
      throw error;
    }
  };

  // Delete truck
  const handleDeleteTruck = async (truckId: string) => {
    try {
      const response = await api.deleteTruck(truckId);

      if (response?.success) {
        const newTrucks = trucks.filter((t) => t.id !== truckId);
        setTrucks(newTrucks);
        if (activeTruckId === truckId) {
          setActiveTruckId(newTrucks.length > 0 ? newTrucks[0].id : null);
        }
      } else {
        alert("Ошибка при удалении фуры");
      }
    } catch (error) {
      alert("Ошибка при удалении фуры");
    }
  };

  // Add position
  const handleAddPosition = async (formData: FormData) => {
    if (!activeTruckId) {
      setAddError("Выберите партию");
      throw new Error("No truck selected");
    }

    try {
      setAddError("");
      const response = await api.createInventoryItem(formData);

      if (response?.success && response.data) {
        setItems((prev) => [response.data, ...prev]);
        try {
          notifyInventoryUpdate();
        } catch (e) {
          console.debug("notifyInventoryUpdate failed", e);
        }
      } else {
        setAddError(response?.error || "Ошибка при добавлении позиции");
        throw new Error(response?.error || "Failed to add position");
      }
    } catch (error) {
      setAddError(
        error instanceof Error
          ? error.message
          : "Ошибка при добавлении позиции",
      );
      throw error;
    }
  };

  // Update position quantity
  const handleUpdateQuantity = async (itemId: number, quantity: number) => {
    try {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const response = await api.updateInventoryItem(itemId, {
        quantity,
      });

      if (response?.success && response.data) {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? response.data : i)),
        );
        try {
          notifyInventoryUpdate();
        } catch (e) {
          console.debug("notifyInventoryUpdate failed", e);
        }
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  // Update position price
  const handleUpdatePrice = async (itemId: number, price: number) => {
    try {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const response = await api.updateInventoryItem(itemId, {
        price,
      });

      if (response?.success && response.data) {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? response.data : i)),
        );
        try {
          notifyInventoryUpdate();
        } catch (e) {
          console.debug("notifyInventoryUpdate failed", e);
        }
      }
    } catch (error) {
      console.error("Error updating price:", error);
    }
  };

  // Update position category
  const handleUpdateCategory = async (
    itemId: number,
    category: string | null,
  ) => {
    try {
      const response = await api.updateInventoryItem(itemId, { category });
      if (response?.success && response.data) {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? response.data : i)),
        );
        try {
          notifyInventoryUpdate();
        } catch (e) {
          console.debug("notifyInventoryUpdate failed", e);
        }
      }
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  // Update position height
  const handleUpdateHeight = async (itemId: number, height: number | null) => {
    try {
      const response = await api.updateInventoryItem(itemId, { height });
      if (response?.success && response.data) {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? response.data : i)),
        );
        try {
          notifyInventoryUpdate();
        } catch (e) {
          console.debug("notifyInventoryUpdate failed", e);
        }
      }
    } catch (error) {
      console.error("Error updating height:", error);
    }
  };

  // Select product from catalog
  const handleSelectProductFromCatalog = async (product: any) => {
    if (!activeTruckId) return;

    try {
      const data = new FormData();
      data.append("name", product.name);
      data.append("quantity", "1");
      data.append("price", String(product.price));
      data.append("truck_id", activeTruckId);
      if (product.photo_url) {
        data.append("photo_url", product.photo_url);
      }
      if (product.variety) {
        data.append("variety", product.variety);
      }
      // Normalize category: do not forward empty/'uncategorized' placeholder
      const rawCat = (product.category as any) || null;
      const categoryToSend =
        rawCat && String(rawCat).trim().toLowerCase() !== "uncategorized"
          ? rawCat
          : null;
      if (categoryToSend) {
        data.append("category", categoryToSend);
      }
      if (
        product.height !== undefined &&
        product.height !== null &&
        String(product.height).trim() !== ""
      ) {
        data.append("height", String(product.height));
      }

      await handleAddPosition(data);
      setShowCatalog(false);
    } catch (error) {
      console.error("Error adding product from catalog:", error);
    }
  };

  // Delete product from catalog
  const handleDeleteProductFromCatalog = async (productId: number) => {
    if (!user?.id) {
      alert("Ошибка: пользователь не авторизован");
      return;
    }

    if (!confirm("Вы уверены, что хотите удалить этот товар из каталога?")) {
      return;
    }

    try {
      const response = await api.deleteProduct(user.id, productId);
      if (response?.success) {
        alert("Товар успешно удален");
      } else {
        alert(
          "Ошибка при удалении товара: " +
            (response?.error || "неизвестная ошибка"),
        );
      }
    } catch (error) {
      console.error("Ошибка при удалении товара:", error);
      alert("Ошибка при удалении товара");
    }
  };

  // Delete position
  const handleDeletePosition = async (itemId: number) => {
    try {
      const response = await api.deleteInventoryItem(itemId);

      if (response?.success) {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        try {
          notifyInventoryUpdate();
        } catch (e) {
          console.debug("notifyInventoryUpdate failed", e);
        }
      } else {
        alert("Ошибка при удалении позиции");
      }
    } catch (error) {
      alert("Ошибка при удалении позиции");
    }
  };

  // Get varieties
  const varieties = useMemo(() => {
    return [...new Set(items.map((item) => item.variety).filter(Boolean))];
  }, [items]);

  // Statistics
  const stats = useMemo(() => {
    const filtered = items.filter((item) => {
      const nameMatch = item.name
        .toLowerCase()
        .startsWith(searchTerm.toLowerCase());
      return nameMatch;
    });

    return {
      totalItems: filtered.length,
      totalQty: filtered.reduce((sum, item) => sum + item.quantity, 0),
      totalCost: filtered.reduce(
        (sum, item) => sum + item.quantity * (item.price as any),
        0,
      ),
    };
  }, [items, searchTerm]);

  if (!user)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-[#568a56] border-t-transparent rounded-full" />
      </div>
    );

  return (
    <DashboardLayout title="Склад / Остатки" requiredRole={["admin", "worker"]}>
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Склад</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Управление партиями и товарами
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-[#568a56] border-t-transparent rounded-full" />
            </div>
          ) : trucks.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-600 mb-4">Партий не создано</p>
              {userPermissions.create_batch && (
                <button
                  onClick={() => setShowCreateTruck(true)}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-[#568a56] hover:bg-[#457245] text-white rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Создать партию
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Truck tabs */}
              <TruckTabs
                trucks={trucks}
                activeTruckId={activeTruckId}
                onSelectTruck={setActiveTruckId}
                onCreateTruck={() => setShowCreateTruck(true)}
                onDeleteTruck={handleDeleteTruck}
                totalCost={stats.totalCost}
                canDeleteTruck={userPermissions.create_batch}
                canCreateTruck={userPermissions.create_batch}
              />

              {activeTruckId && (
                <>
                  {/* Add position buttons */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {userPermissions.create_product && (
                      <button
                        onClick={() => setShowAddPosition(true)}
                        className="px-4 py-2 bg-[#568a56] hover:bg-[#457245] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Создать товар
                      </button>
                    )}
                    {userPermissions.edit_truck && (
                      <button
                        onClick={() => setShowCatalog(true)}
                        className="px-4 py-2 bg-[#F9FAFB] border border-[#D1D5DB] hover:bg-[#F3F4F6] text-gray-900 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Из каталога
                      </button>
                    )}
                  </div>

                  {/* Filters panel - always visible */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                    <div className="space-y-4">
                      {/* Search bar - always visible */}
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Поиск товара..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] transition-all"
                        />
                      </div>

                      {/* Filter and sort row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Category filter */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            По категориям
                          </label>
                          <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] transition-all text-sm"
                          >
                            <option value="">Все категории</option>
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Sort field */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            По ценам или по кол-вом
                          </label>
                          <select
                            value={sortField}
                            onChange={(e) =>
                              setSortField(e.target.value as any)
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] transition-all text-sm"
                          >
                            <option value="price">По ценам</option>
                            <option value="quantity">По кол-вом</option>
                          </select>
                        </div>

                        {/* Sort order */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Выбрать{" "}
                            {sortField === "price" ? "сначала" : "сначала"}
                          </label>
                          <select
                            value={sortOrder}
                            onChange={(e) =>
                              setSortOrder(e.target.value as any)
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] transition-all text-sm"
                          >
                            {sortField === "price" ? (
                              <>
                                <option value="desc">Сначала дороже</option>
                                <option value="asc">Сначала дешевле</option>
                              </>
                            ) : (
                              <>
                                <option value="desc">Сначала больше</option>
                                <option value="asc">Сначала меньше</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items table */}
                  {itemsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin w-8 h-8 border-4 border-[#568a56] border-t-transparent rounded-full" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                      <p className="text-gray-600">Товаров нет</p>
                    </div>
                  ) : (
                    <InventoryTable
                      items={items}
                      onEdit={() => {}}
                      onDelete={handleDeletePosition}
                      onUpdateQuantity={handleUpdateQuantity}
                      onUpdatePrice={handleUpdatePrice}
                      onUpdateCategory={handleUpdateCategory}
                      onUpdateHeight={handleUpdateHeight}
                      categories={categories}
                      isLoading={false}
                      searchTerm={searchTerm}
                      filterCategory={filterCategory}
                      sortField={sortField}
                      sortOrder={sortOrder}
                      canEditPosition={userPermissions.edit_position}
                      canEditTruck={userPermissions.edit_truck}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Modals */}
        <CreateTruckModal
          isOpen={showCreateTruck}
          onClose={() => setShowCreateTruck(false)}
          onSubmit={handleCreateTruck}
        />

        <AddPositionModal
          isOpen={showAddPosition}
          onClose={() => setShowAddPosition(false)}
          onSubmit={handleAddPosition}
          truckId={activeTruckId || ""}
        />

        <ProductCatalogModal
          isOpen={showCatalog}
          onClose={() => setShowCatalog(false)}
          onSelect={handleSelectProductFromCatalog}
          onDelete={handleDeleteProductFromCatalog}
          truckId={activeTruckId || ""}
        />
      </div>
    </DashboardLayout>
  );
}
