"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { PreorderBannerSettings } from "@/lib/gf-firestore/preorder-banner-settings";
import {
  ChevronDown,
  ChevronUp,
  BarChart3,
  Truck,
  Users,
  Settings,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Percent,
  Edit,
  Trash2,
  Save,
  X,
  Plus,
  Building2,
  TrendingUp,
  Eye,
  EyeOff,
  Megaphone,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

interface Manager {
  id: number;
  name: string;
  email: string;
  phone: string;
  /** Firestore profiles/{profileUid}; обязателен для разрешений */
  profileUid?: string;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
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
  const [isPreorderBannerOpen, setIsPreorderBannerOpen] = useState(false);
  const [isTruckAnalyticsOpen, setIsTruckAnalyticsOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Баннер «Предзаказ» на главной
  const [preorderVisible, setPreorderVisible] = useState(true);
  const [preorderDeadlineText, setPreorderDeadlineText] =
    useState("21 февраля");
  const [preorderDiscount, setPreorderDiscount] = useState(5);
  const [preorderWhatsapp, setPreorderWhatsapp] = useState("77082354533");
  const [preorderBannerSaving, setPreorderBannerSaving] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Truck analytics state
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");
  const [analyticsStartDate, setAnalyticsStartDate] = useState<string>("");
  const [analyticsEndDate, setAnalyticsEndDate] = useState<string>("");
  const [truckAnalytics, setTruckAnalytics] = useState<any>(null);
  const [truckAnalyticsLoading, setTruckAnalyticsLoading] = useState(false);

  // Manager permissions state
  const [selectedManagerId, setSelectedManagerId] = useState<string | undefined>(
    undefined,
  );
  const [managerPermissions, setManagerPermissions] = useState({
    create_product: true,
    create_batch: true,
    edit_truck: true,
    edit_position: true,
  });

  // Base percent for manager commission calculation (e.g. 3%)
  const [baseManagerPercent, setBaseManagerPercent] = useState<number>(3);
  const [basePercentError, setBasePercentError] = useState<string | null>(null);
  const [isSavingBasePercent, setIsSavingBasePercent] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadAllData();
    loadCitiesFromStorage();
    loadBasePercentFromStorage();
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

  const loadBasePercentFromStorage = () => {
    const savedValue = localStorage.getItem("baseManagerPercent");
    if (savedValue) {
      const parsed = parseFloat(savedValue);
      if (!isNaN(parsed)) {
        setBaseManagerPercent(parsed);
      }
    }
  };

  const saveBasePercentToStorage = (percent: number) => {
    localStorage.setItem("baseManagerPercent", percent.toString());
    window.dispatchEvent(
      new CustomEvent("baseManagerPercentUpdated", { detail: { percent } }),
    );
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

      const [cityStatsRaw, trucksResponse, managersList] = await Promise.all([
        api.getAdminCityStats(),
        api.getAllTrucks(),
        api.getAdminManagers(),
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
      setManagers(Array.isArray(managersList) ? managersList : []);

      try {
        const bannerRes = await api.getPreorderBannerSettings();
        if (
          bannerRes &&
          typeof bannerRes === "object" &&
          (bannerRes as { success?: boolean }).success &&
          "data" in bannerRes
        ) {
          const b = (bannerRes as { success: true; data: PreorderBannerSettings })
            .data;
          setPreorderVisible(b.visible);
          setPreorderDeadlineText(b.deadline_text);
          setPreorderDiscount(b.discount_percent);
          setPreorderWhatsapp(b.whatsapp_digits);
        }
      } catch {
        /* баннер — необязательно, не блокируем настройки */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (manager: Manager) => {
    setEditingId(manager.id);
    setFormData({
      name: manager.name,
      email: (manager.phone || manager.email || "").trim(),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", email: "" });
  };

  const saveEdit = async () => {
    if (!editingId || !user) return;
    if (user.role !== "admin") {
      alert("Редактирование менеджеров доступно только администратору.");
      return;
    }

    try {
      setIsSubmitting(true);
      const mgr = managers.find((m) => m.id === editingId);
      const raw = formData.email.trim();
      const payload: Record<string, string> = {
        name: formData.name.trim(),
      };
      if (raw.includes("@")) {
        payload.email = raw;
      } else if (raw) {
        payload.phone = raw;
      }
      const res: any = await api.updateUser(
        user.id,
        editingId,
        payload,
        mgr?.profileUid,
      );
      if (!res?.success) {
        throw new Error(res?.error || "Не удалось обновить менеджера");
      }
      await loadAllData();
      cancelEdit();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Ошибка обновления менеджера";
      setError(msg);
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteManager = async (id: number) => {
    if (!user) return;
    if (user.role !== "admin") {
      alert("Удаление менеджеров доступно только администратору.");
      return;
    }
    if (!window.confirm("Вы уверены?")) return;

    try {
      setIsSubmitting(true);
      const mgr = managers.find((m) => m.id === id);
      const res: any = await api.deleteUser(user.id, id, mgr?.profileUid);
      if (!res?.success) {
        throw new Error(res?.error || "Не удалось удалить менеджера");
      }
      await loadAllData();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Ошибка удаления менеджера";
      setError(msg);
      alert(msg);
    } finally {
      setIsSubmitting(false);
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

  const fetchAnalytics = async () => {
    if (!selectedCity) {
      setError("Выберите город");
      return;
    }

    await fetchAnalyticsForCity(selectedCity);
  };

  const savePreorderBannerSettings = async () => {
    try {
      setPreorderBannerSaving(true);
      setError(null);
      const res = await api.savePreorderBannerSettingsAdmin({
        visible: preorderVisible,
        deadline_text: preorderDeadlineText.trim() || "21 февраля",
        discount_percent: Number(preorderDiscount) || 0,
        whatsapp_digits: preorderWhatsapp,
      });
      if (!res?.success) {
        const msg =
          res && typeof res === "object" && "error" in res
            ? String((res as { error?: string }).error || "")
            : "";
        throw new Error(msg || "Не удалось сохранить настройки");
      }
      window.dispatchEvent(new CustomEvent("preorderBannerSettingsUpdated"));
      alert("✅ Баннер сохранён");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка сохранения баннера",
      );
      alert(
        "❌ " + (err instanceof Error ? err.message : "Ошибка сохранения"),
      );
    } finally {
      setPreorderBannerSaving(false);
    }
  };

  const fetchTruckAnalytics = async () => {
    if (!selectedTruckId || !analyticsStartDate || !analyticsEndDate) {
      setError("Выберите фуру и укажите даты");
      return;
    }

    try {
      setTruckAnalyticsLoading(true);
      setTruckAnalytics(null);
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

  // Manager permissions functions
  const loadManagerPermissions = async (profileUid: string) => {
    try {
      const data = await api.getManagerPermissions(profileUid);
      if (data?.success && data.permissions) {
        setManagerPermissions(data.permissions);
      } else {
        setManagerPermissions({
          create_product: true,
          create_batch: true,
          edit_truck: true,
          edit_position: true,
        });
      }
    } catch (err) {
      console.error("Error loading manager permissions:", err);
      setManagerPermissions({
        create_product: true,
        create_batch: true,
        edit_truck: true,
        edit_position: true,
      });
    }
  };

  const saveManagerPermissions = async () => {
    if (!selectedManagerId?.trim()) {
      setError("Выберите менеджера");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.setManagerPermissions(
        selectedManagerId,
        managerPermissions,
      );
      if (!res?.success) {
        throw new Error(res?.error || "Не удалось сохранить разрешения");
      }
      setError(null);
      alert("✅ Разрешения сохранены успешно");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка сохранения разрешений",
      );
      alert(
        "❌ Ошибка: " + (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManagerChange = (managerId: string) => {
    const uid = managerId?.trim() || undefined;
    setSelectedManagerId(uid);
    if (uid) {
      loadManagerPermissions(uid);
    } else {
      setManagerPermissions({
        create_product: true,
        create_batch: true,
        edit_truck: true,
        edit_position: true,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#568a56] mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
          <Settings className="h-8 w-8 text-[#568a56]" />
          Настройки администратора
        </h1>
        <p className="text-gray-600">
          Управление аналитикой, менеджерами и настройками системы
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-3 w-3" />
              </div>
              <p className="font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Баннер «Предзаказ» на главной */}
      <Card>
        <Collapsible
          open={isPreorderBannerOpen}
          onOpenChange={setIsPreorderBannerOpen}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Megaphone className="h-5 w-5 text-[#568a56]" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Баннер «Предзаказ»</CardTitle>
                    <CardDescription>
                      Дедлайн, процент скидки, WhatsApp и показ на главной
                    </CardDescription>
                  </div>
                </div>
                {isPreorderBannerOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4 flex-wrap rounded-lg border border-gray-200 p-4 bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">Показывать баннер</p>
                  <p className="text-sm text-gray-500">
                    Выключите, чтобы скрыть блок на главной странице
                  </p>
                </div>
                <Switch
                  checked={preorderVisible}
                  onCheckedChange={setPreorderVisible}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preorder-deadline-text">
                    Текст после «Успейте до»
                  </Label>
                  <Input
                    id="preorder-deadline-text"
                    value={preorderDeadlineText}
                    onChange={(e) => setPreorderDeadlineText(e.target.value)}
                    placeholder="21 февраля"
                  />
                  <p className="text-xs text-gray-500">
                    На сайте: Успейте до {preorderDeadlineText.trim() || "…"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preorder-deadline-date">
                    Или выберите дату
                  </Label>
                  <Input
                    id="preorder-deadline-date"
                    type="date"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      const d = new Date(`${v}T12:00:00`);
                      setPreorderDeadlineText(
                        d.toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                        }),
                      );
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preorder-discount">Скидка, %</Label>
                  <Input
                    id="preorder-discount"
                    type="number"
                    min={0}
                    max={99}
                    value={preorderDiscount}
                    onChange={(e) =>
                      setPreorderDiscount(
                        Math.min(
                          99,
                          Math.max(0, parseInt(e.target.value, 10) || 0),
                        ),
                      )
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Бейдж на баннере: -{preorderDiscount}% (при 0% бейдж скрыт)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preorder-wa">WhatsApp</Label>
                  <Input
                    id="preorder-wa"
                    value={preorderWhatsapp}
                    onChange={(e) => setPreorderWhatsapp(e.target.value)}
                    placeholder="+7 708 235 4533"
                  />
                  <p className="text-xs text-gray-500">
                    Сохраняются только цифры, минимум 10
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={savePreorderBannerSettings}
                  disabled={preorderBannerSaving}
                  className="bg-[#568a56] hover:bg-[#457245]"
                >
                  {preorderBannerSaving ? (
                    <span className="inline-flex items-center">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Сохранение…
                    </span>
                  ) : (
                    <span className="inline-flex items-center">
                      <Save className="h-4 w-4 mr-2" />
                      Сохранить баннер
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* City Analytics Section */}
      <Card>
        <Collapsible open={isCityOpen} onOpenChange={setIsCityOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Анализ по городам</CardTitle>
                    <CardDescription>
                      Статистика продаж и аналитика по городам
                    </CardDescription>
                  </div>
                </div>
                {isCityOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* City Management Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowCityManagement(true)}
                  className="bg-[#568a56] hover:bg-[#457245]"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Управление городами
                </Button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city-select" className="text-sm font-medium">
                    Выберите город
                  </Label>
                  <Select
                    value={selectedCity || undefined}
                    onValueChange={(value) => {
                      setSelectedCity(value);
                      setAnalytics(null);
                      if (value) {
                        fetchAnalyticsForCity(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Выберите город" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-sm font-medium">
                    Дата от
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setAnalytics(null);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-sm font-medium">
                    Дата до
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setAnalytics(null);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={fetchAnalytics}
                  disabled={analyticsLoading || !selectedCity}
                  className="bg-[#568a56] hover:bg-[#457245] min-w-[200px]"
                >
                  {analyticsLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Обновление...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Обновить аналитику
                    </>
                  )}
                </Button>
              </div>

              {/* Analytics Results */}
              <Card
                className={`transition-all duration-300 ${selectedCity ? "border-[#568a56] shadow-md" : "border-gray-200 opacity-60"}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {selectedCity
                      ? `Аналитика для города ${selectedCity}`
                      : "Выберите город для просмотра аналитики"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-1">Заказы</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {analyticsLoading
                            ? "..."
                            : analytics
                              ? analytics.orders_count
                              : selectedCity
                                ? "0"
                                : "-"}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-red-50 border-red-200">
                      <CardContent className="p-4 text-center">
                        <DollarSign className="h-8 w-8 text-red-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-1">Скидки</p>
                        <p className="text-2xl font-bold text-red-700">
                          {analyticsLoading
                            ? "..."
                            : analytics
                              ? `${analytics.total_discounts.toLocaleString("ru-RU")} ₸`
                              : selectedCity
                                ? "0 ₸"
                                : "-"}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="p-4 text-center">
                        <TrendingUp className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-1">Возвраты</p>
                        <p className="text-2xl font-bold text-gray-700">
                          {analyticsLoading
                            ? "..."
                            : analytics
                              ? `${analytics.total_returns.toLocaleString("ru-RU")} ₸`
                              : selectedCity
                                ? "0 ₸"
                                : "-"}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4 text-center">
                        <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-1">
                          Общая сумма
                        </p>
                        <p className="text-2xl font-bold text-green-700">
                          {analyticsLoading
                            ? "..."
                            : analytics
                              ? `${analytics.total_sum.toLocaleString("ru-RU")} ₸`
                              : selectedCity
                                ? "0 ₸"
                                : "-"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* City Stats Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Статистика по всем городам
                  </CardTitle>
                  <CardDescription>Обзор заказов по городам</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Город</TableHead>
                        <TableHead className="text-right">Заказы</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cityStats.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center py-8 text-gray-500"
                          >
                            Нет данных
                          </TableCell>
                        </TableRow>
                      ) : (
                        cityStats.map((city) => (
                          <TableRow
                            key={city.city}
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setSelectedCity(city.city)}
                          >
                            <TableCell className="font-medium">
                              {city.city}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{city.orders}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Truck Analytics Section */}
      <Card>
        <Collapsible
          open={isTruckAnalyticsOpen}
          onOpenChange={setIsTruckAnalyticsOpen}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      Аналитика продаж фур
                    </CardTitle>
                    <CardDescription>
                      Статистика продаж по отдельным фурам
                    </CardDescription>
                  </div>
                </div>
                {isTruckAnalyticsOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Truck and Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="truck-select" className="text-sm font-medium">
                    Выберите фуру
                  </Label>
                  <Select
                    value={selectedTruckId || undefined}
                    onValueChange={(value) => {
                      setTruckAnalytics(null);
                      setSelectedTruckId(value);
                      if (value) {
                        const selectedTruck = trucks.find(
                          (t) => t.id === value,
                        );
                        if (selectedTruck) {
                          const arrivalDate = new Date(
                            selectedTruck.arrival_date,
                          )
                            .toISOString()
                            .split("T")[0];
                          setAnalyticsStartDate(arrivalDate);
                          setAnalyticsEndDate((prev) => {
                            const p = String(prev || "").trim();
                            const ok =
                              /^\d{4}-\d{2}-\d{2}$/.test(p) &&
                              Number(p.slice(0, 4)) >= 1970 &&
                              Number(p.slice(0, 4)) <= 2100;
                            if (ok) return p;
                            const t = new Date();
                            t.setFullYear(t.getFullYear() + 1);
                            return t.toISOString().split("T")[0]!;
                          });
                        }
                      } else {
                        setAnalyticsStartDate("");
                        setAnalyticsEndDate("");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Выберите фуру" />
                    </SelectTrigger>
                    <SelectContent>
                      {trucks.map((truck) => (
                        <SelectItem key={truck.id} value={truck.id}>
                          {truck.identifier} (прибытие:{" "}
                          {new Date(truck.arrival_date).toLocaleDateString(
                            "ru-RU",
                          )}
                          )
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="truck-start-date"
                    className="text-sm font-medium"
                  >
                    Дата от
                  </Label>
                  <Input
                    id="truck-start-date"
                    type="date"
                    value={analyticsStartDate}
                    min="1970-01-01"
                    max="2100-12-31"
                    onChange={(e) => {
                      setAnalyticsStartDate(e.target.value);
                      setTruckAnalytics(null);
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    По умолчанию — дата прибытия фуры; при необходимости
                    измените
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="truck-end-date"
                    className="text-sm font-medium"
                  >
                    Дата до
                  </Label>
                  <Input
                    id="truck-end-date"
                    type="date"
                    value={analyticsEndDate}
                    min="1970-01-01"
                    max="2100-12-31"
                    onChange={(e) => {
                      setAnalyticsEndDate(e.target.value);
                      setTruckAnalytics(null);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={fetchTruckAnalytics}
                  disabled={truckAnalyticsLoading}
                  className="bg-[#568a56] hover:bg-[#457245] min-w-[200px]"
                >
                  {truckAnalyticsLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Показать аналитику
                    </>
                  )}
                </Button>
              </div>

              {/* Analytics Results */}
              {truckAnalytics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Аналитика продаж фуры{" "}
                      {truckAnalytics.truck_identifier || truckAnalytics.truckId}
                    </CardTitle>
                    <CardDescription>
                      Период: {truckAnalytics.startDate} -{" "}
                      {truckAnalytics.endDate}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Percent className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-700 font-medium">
                          Средний процент продаж
                        </p>
                        <p className="text-2xl font-bold text-blue-800">
                          {truckAnalytics.average_sales_percentage}%
                        </p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Позиция цветов</TableHead>
                          <TableHead className="text-right">
                            Количество всего
                          </TableHead>
                          <TableHead className="text-right">
                            Продано до даты
                          </TableHead>
                          <TableHead className="text-right">
                            Процент продаж
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {truckAnalytics.items.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center py-8 text-gray-500"
                            >
                              Нет данных
                            </TableCell>
                          </TableRow>
                        ) : (
                          truckAnalytics.items.map(
                            (item: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {item.name}
                                  {item.variety && (
                                    <span className="text-gray-500 ml-1">
                                      ({item.variety})
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline">
                                    {item.total_ever}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary">
                                    {item.sold_before_date}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge
                                    variant={
                                      item.sales_percentage > 50
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={
                                      item.sales_percentage > 50
                                        ? "bg-green-100 text-green-800"
                                        : ""
                                    }
                                  >
                                    {item.sales_percentage}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ),
                          )
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Manager Management Section */}
      <Card>
        <Collapsible open={isManagerOpen} onOpenChange={setIsManagerOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      Управление менеджерами
                    </CardTitle>
                    <CardDescription>
                      Управление пользователями и их разрешениями. Сохранение и
                      удаление — только для роли администратора.
                    </CardDescription>
                  </div>
                </div>
                {isManagerOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Edit Manager Form */}
              {editingId && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Edit className="h-5 w-5" />
                      Редактировать менеджера
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="manager-name"
                          className="text-sm font-medium"
                        >
                          Имя
                        </Label>
                        <Input
                          id="manager-name"
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((f) => ({ ...f, name: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="manager-email"
                          className="text-sm font-medium"
                        >
                          Номер
                        </Label>
                        <Input
                          id="manager-email"
                          type="text"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="+7 777 123 45 67"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              email: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={() => void saveEdit()}
                        disabled={isSubmitting || user?.role !== "admin"}
                        className="bg-[#568a56] hover:bg-[#457245]"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Сохранить
                      </Button>
                      <Button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isSubmitting}
                        variant="outline"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Отмена
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Managers Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Список менеджеров</CardTitle>
                  <CardDescription>
                    Управление пользователями системы
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Имя</TableHead>
                        <TableHead>Номер</TableHead>
                        <TableHead className="text-center">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center py-8 text-gray-500"
                          >
                            Нет менеджеров
                          </TableCell>
                        </TableRow>
                      ) : (
                        managers.map((mgr) => (
                          <TableRow key={mgr.id}>
                            <TableCell className="font-medium">
                              {mgr.name}
                            </TableCell>
                            <TableCell>
                              {(mgr.phone || mgr.email || "—").trim()}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  type="button"
                                  onClick={() => startEdit(mgr)}
                                  disabled={
                                    isSubmitting ||
                                    editingId !== null ||
                                    user?.role !== "admin"
                                  }
                                  size="sm"
                                  variant="outline"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Редактировать
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => void deleteManager(mgr.id)}
                                  disabled={
                                    isSubmitting ||
                                    editingId !== null ||
                                    user?.role !== "admin"
                                  }
                                  size="sm"
                                  variant="destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Удалить
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Manager Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Управление доступами
                  </CardTitle>
                  <CardDescription>
                    Настройка разрешений для менеджеров
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="manager-select"
                      className="text-sm font-medium"
                    >
                      Выберите менеджера
                    </Label>
                    <Select
                      value={selectedManagerId || undefined}
                      onValueChange={handleManagerChange}
                    >
                      <SelectTrigger className="w-full min-w-0 max-w-full">
                        <SelectValue placeholder="Выберите менеджера" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map((mgr) => {
                          const uid = mgr.profileUid || String(mgr.id);
                          return (
                            <SelectItem key={uid} value={uid}>
                              {mgr.name} ({mgr.email})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedManagerId && (
                    <div className="space-y-4">
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <Switch
                            id="create-product"
                            checked={managerPermissions.create_product}
                            onCheckedChange={(checked) =>
                              setManagerPermissions((prev) => ({
                                ...prev,
                                create_product: checked,
                              }))
                            }
                          />
                          <div>
                            <Label
                              htmlFor="create-product"
                              className="text-sm font-medium cursor-pointer"
                            >
                              Создать товар
                            </Label>
                            <p className="text-xs text-gray-500">
                              Разрешение на добавление новых товаров
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <Switch
                            id="create-batch"
                            checked={managerPermissions.create_batch}
                            onCheckedChange={(checked) =>
                              setManagerPermissions((prev) => ({
                                ...prev,
                                create_batch: checked,
                              }))
                            }
                          />
                          <div>
                            <Label
                              htmlFor="create-batch"
                              className="text-sm font-medium cursor-pointer"
                            >
                              Создать новую партию
                            </Label>
                            <p className="text-xs text-gray-500">
                              Разрешение на создание фур
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <Switch
                            id="edit-truck"
                            checked={managerPermissions.edit_truck}
                            onCheckedChange={(checked) =>
                              setManagerPermissions((prev) => ({
                                ...prev,
                                edit_truck: checked,
                              }))
                            }
                          />
                          <div>
                            <Label
                              htmlFor="edit-truck"
                              className="text-sm font-medium cursor-pointer"
                            >
                              Редактировать фуру
                            </Label>
                            <p className="text-xs text-gray-500">
                              Добавлять и удалять товар в фуру
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <Switch
                            id="edit-position"
                            checked={managerPermissions.edit_position}
                            onCheckedChange={(checked) =>
                              setManagerPermissions((prev) => ({
                                ...prev,
                                edit_position: checked,
                              }))
                            }
                          />
                          <div>
                            <Label
                              htmlFor="edit-position"
                              className="text-sm font-medium cursor-pointer"
                            >
                              Редактировать позицию
                            </Label>
                            <p className="text-xs text-gray-500">
                              Изменять параметры товаров
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Base manager percent setting */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              Базовый процент менеджера
                            </p>
                            <p className="text-xs text-gray-500">
                              Используется при расчёте бонусов менеджеров (по
                              умолчанию 3%)
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={
                                isNaN(baseManagerPercent)
                                  ? ""
                                  : baseManagerPercent.toString()
                              }
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setBaseManagerPercent(isNaN(val) ? 0 : val);
                              }}
                              className="w-24"
                            />
                            <span className="text-sm text-gray-600">%</span>
                          </div>
                        </div>
                        {basePercentError && (
                          <p className="text-xs text-red-600 mt-2">
                            {basePercentError}
                          </p>
                        )}
                        <Button
                          onClick={async () => {
                            const percent = Number(baseManagerPercent);
                            if (
                              isNaN(percent) ||
                              percent < 0 ||
                              percent > 100
                            ) {
                              setBasePercentError("Введите число от 0 до 100");
                              return;
                            }
                            setBasePercentError(null);
                            setIsSavingBasePercent(true);
                            saveBasePercentToStorage(percent);
                            setTimeout(
                              () => setIsSavingBasePercent(false),
                              300,
                            );
                            alert("✅ Базовый процент менеджера обновлён");
                          }}
                          disabled={isSavingBasePercent}
                          className="mt-3"
                        >
                          Сохранить процент
                        </Button>
                      </div>
                      <div className="flex justify-end pt-4">
                        <Button
                          onClick={saveManagerPermissions}
                          disabled={isSubmitting}
                          className="bg-[#568a56] hover:bg-[#457245] min-w-[200px]"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Сохранение...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Сохранить разрешения
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* City Management Modal */}
      <Dialog open={showCityManagement} onOpenChange={setShowCityManagement}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Управление городами
            </DialogTitle>
            <DialogDescription>
              Добавляйте и удаляйте города из списка доступных для доставки
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add new city */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Добавить новый город
              </Label>
              <div className="flex gap-3">
                <Input
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="Название нового города"
                  className="flex-1"
                />
                <Button
                  onClick={addNewCity}
                  className="bg-[#568a56] hover:bg-[#457245]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>
            </div>

            {/* Current cities list */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Доступные города ({availableCities.length})
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 border rounded-lg bg-gray-50">
                {availableCities.map((city) => (
                  <div
                    key={city}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm"
                  >
                    <span className="font-medium text-sm">{city}</span>
                    <Button
                      onClick={() => setShowDeleteConfirm(city)}
                      size="sm"
                      variant="destructive"
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete City Confirmation Modal */}
      <Dialog
        open={!!showDeleteConfirm}
        onOpenChange={() => setShowDeleteConfirm(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Подтверждение удаления
            </DialogTitle>
            <DialogDescription>
              Вы действительно хотите удалить город{" "}
              <strong>"{showDeleteConfirm}"</strong>?
              <br />
              <span className="text-sm text-gray-500 mt-2 block">
                Это действие нельзя отменить. Город будет удален из списка
                доступных городов.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={() => setShowDeleteConfirm(null)}
              variant="outline"
            >
              Отмена
            </Button>
            <Button
              onClick={() => deleteCity(showDeleteConfirm!)}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
