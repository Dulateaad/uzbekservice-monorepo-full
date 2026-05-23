"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useCity } from "@/contexts/city-context";
import { api } from "@/lib/api-client";
import { Header } from "@/components/header";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  Save,
  X,
  LogOut,
  ShoppingBag,
  Settings,
  Check,
  AlertCircle,
  Shield,
  Truck,
  Building2,
  Eye,
  EyeOff,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProfilePage() {
  const { user, updateUser, logout, isLoading: authLoading } = useAuth();
  const { city } = useCity();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [ordersSummary, setOrdersSummary] = useState<{
    count: number;
    lastOrder?: string;
  } | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  // Инициализация формы при загрузке пользователя
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    }
  }, [user]);

  // Загружаем статистику по заказам пользователя
  useEffect(() => {
    const loadOrdersSummary = async () => {
      if (!user?.id) return;

      setOrdersLoading(true);
      try {
        const response = await api.getUserOrders(user.id);
        const orders = response.orders || [];
        const count = orders.length;

        const lastOrder = orders
          .filter((o: any) => o.created_at)
          .sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )[0];

        setOrdersSummary({
          count,
          lastOrder: lastOrder?.created_at || lastOrder?.delivery_date,
        });
      } catch (err) {
        console.error("Не удалось загрузить статистику заказов", err);
        setOrdersSummary({ count: 0 });
      } finally {
        setOrdersLoading(false);
      }
    };

    loadOrdersSummary();
  }, [user]);

  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString("ru", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#568a56] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 flex items-center justify-center pb-24">
        <Card className="max-w-md w-full text-center shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-[#568a56] to-[#2f6f4a] rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-3">
              Мой профиль
            </CardTitle>
            <CardDescription className="text-gray-600 mb-8 text-lg">
              Пожалуйста, войдите в аккаунт чтобы просмотреть и редактировать
              профиль
            </CardDescription>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                asChild
                className="bg-[#568a56] hover:bg-[#457245] shadow-md"
              >
                <Link href="/auth/login">
                  <LogOut className="w-4 h-4 mr-2 rotate-180" />
                  Войти
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-[#568a56] text-[#568a56] hover:bg-[#568a56] hover:text-white shadow-md"
              >
                <Link href="/auth/sign-up">
                  <User className="w-4 h-4 mr-2" />
                  Регистрация
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.address.trim()) {
      newErrors.address = "Адрес доставки - обязательное поле";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Имя - обязательное поле";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Очищаем ошибку при вводе
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setSuccessMessage("");
    setErrors({});

    try {
      // Обновляем данные пользователя через API
      const response = await api.updateProfile(user.id, {
        id: user.id,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
      });

      if (response.success) {
        // Обновляем пользователя в контексте
        updateUser({
          ...user,
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
        });

        setSuccessMessage("Профиль успешно обновлен");
        setIsEditMode(false);

        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrors({ submit: response.error || "Ошибка при сохранении" });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || "Ошибка при сохранении профиля" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Восстанавливаем исходные данные
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    }
    setIsEditMode(false);
    setErrors({});
  };

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      <div className="max-w-4xl mx-auto py-12 px-4 pb-24">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <User className="h-10 w-10 text-[#568a56]" />
            Мой профиль
          </h1>
          <p className="text-gray-600 text-lg">
            Управление информацией об аккаунте
          </p>
        </div>

        {/* Сообщение об ошибке при сохранении */}
        {errors.submit && (
          <Card className="mb-6 border-red-200 bg-red-50 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-red-700 font-medium">{errors.submit}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Сообщение об успехе */}
        {successMessage && (
          <Card className="mb-6 border-green-200 bg-green-50 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-green-700 font-medium">{successMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Основная карточка профиля */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Аватар и основная информация */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-8 border-b border-gray-200">
              <div className="w-24 h-24 bg-gradient-to-br from-[#568a56] to-[#2f6f4a] rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-3xl font-bold text-white">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-3xl font-bold text-gray-900 mb-1">
                  {user.name || "Пользователь"}
                </h2>
                <p className="text-gray-600 mb-3 flex items-center justify-center sm:justify-start gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
                {user.role && (
                  <div className="flex justify-center sm:justify-start">
                    <Badge
                      variant="secondary"
                      className={`px-4 py-2 text-sm font-medium ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : user.role === "worker"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                      }`}
                    >
                      {user.role === "admin" && (
                        <Shield className="h-4 w-4 mr-1" />
                      )}
                      {user.role === "worker" && (
                        <Truck className="h-4 w-4 mr-1" />
                      )}
                      {user.role === "user" && (
                        <User className="h-4 w-4 mr-1" />
                      )}
                      {user.role === "admin"
                        ? "Администратор"
                        : user.role === "worker"
                          ? "Работник"
                          : "Пользователь"}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Быстрая статистика и действия */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
              {/* Статистика заказов */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Мои заказы
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#568a56]/10 text-[#568a56]">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-3xl font-semibold text-gray-900">
                          {ordersLoading ? "..." : (ordersSummary?.count ?? 0)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {ordersLoading
                            ? "Загружаем..."
                            : ordersSummary?.lastOrder
                              ? `Последний заказ: ${formatDate(ordersSummary.lastOrder)}`
                              : "Пока нет заказов"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="self-start h-10">
                    <Link href="/orders">Мои заказы</Link>
                  </Button>
                </div>
              </div>

              {/* Быстрые действия */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Быстрые действия
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Управляйте профилем и доступом в один клик.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => setIsEditMode(true)}
                    className="w-full justify-center bg-[#568a56] hover:bg-[#457245] shadow-sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Редактировать профиль
                  </Button>
                  <Button
                    onClick={() => setShowLogoutConfirm(true)}
                    variant="outline"
                    className="w-full justify-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Выйти из аккаунта
                  </Button>
                </div>
              </div>
            </div>

            {/* Форма профиля */}
            <div className="space-y-6 mb-8">
              {/* Имя */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-semibold text-gray-900 flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Имя <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!isEditMode}
                  className={`transition-all duration-200 ${
                    isEditMode
                      ? "border-gray-300 focus:border-[#568a56] focus:ring-2 focus:ring-[#568a56]/20"
                      : "border-gray-200 bg-gray-50 cursor-not-allowed"
                  } ${errors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  placeholder="Введите ваше имя"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email (readonly) */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-gray-900 flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500">Email нельзя изменить</p>
              </div>

              {/* Город (автоматический, readonly) */}
              <div className="space-y-2">
                <Label
                  htmlFor="city"
                  className="text-sm font-semibold text-gray-900 flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Город
                </Label>
                <div className="relative">
                  <Input
                    id="city"
                    type="text"
                    value={city || "Выберите город в меню"}
                    disabled
                    className="border-gray-200 bg-blue-50 text-gray-900 cursor-not-allowed pr-10"
                  />
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Город берётся автоматически из выбранного в Header
                </p>
              </div>

              {/* Номер телефона */}
              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className="text-sm font-semibold text-gray-900 flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Номер телефона
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditMode}
                  placeholder="+7 (999) 123-45-67"
                  className={`transition-all duration-200 ${
                    isEditMode
                      ? "border-gray-300 focus:border-[#568a56] focus:ring-2 focus:ring-[#568a56]/20"
                      : "border-gray-200 bg-gray-50 cursor-not-allowed"
                  }`}
                />
                <p className="text-xs text-gray-500">
                  Используется для связи по заказам
                </p>
              </div>

              {/* Адрес доставки */}
              <div className="space-y-2">
                <Label
                  htmlFor="address"
                  className="text-sm font-semibold text-gray-900 flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Адрес доставки <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!isEditMode}
                  placeholder="Ул. Ленина, д. 15, кв. 10"
                  className={`transition-all duration-200 ${
                    isEditMode
                      ? "border-gray-300 focus:border-[#568a56] focus:ring-2 focus:ring-[#568a56]/20"
                      : "border-gray-200 bg-gray-50 cursor-not-allowed"
                  } ${errors.address ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
                {errors.address ? (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.address}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Укажите адрес для доставки заказов
                  </p>
                )}
              </div>
            </div>

            {/* Кнопки управления профилем */}
            <div className="flex gap-3 mb-8">
              {!isEditMode ? (
                <>
                  <Button
                    onClick={() => setIsEditMode(true)}
                    className="flex-1 bg-[#568a56] hover:bg-[#457245] shadow-md h-12"
                  >
                    <Edit className="h-5 w-5 mr-2" />
                    Редактировать профиль
                  </Button>
                  <Button
                    onClick={() => setShowLogoutConfirm(true)}
                    variant="destructive"
                    className="shadow-md h-12"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Выйти
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 bg-green-600 hover:bg-green-700 shadow-md h-12"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Сохраняю...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        Сохранить изменения
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={isSaving}
                    variant="outline"
                    className="flex-1 shadow-md h-12"
                  >
                    <X className="h-5 w-5 mr-2" />
                    Отмена
                  </Button>
                </>
              )}
            </div>

            {/* Кнопки по ролям */}
            {user.role && user.role !== "user" && (
              <>
                <Separator className="my-6" />
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-[#568a56]" />
                    Админ-функции
                  </h3>
                  <div className="flex gap-3 flex-wrap">
                    {user.role === "admin" && (
                      <Button
                        asChild
                        className="bg-purple-600 hover:bg-purple-700 shadow-md"
                      >
                        <Link href="/admin/orders">
                          <Shield className="h-4 w-4 mr-2" />
                          Админ панель
                        </Link>
                      </Button>
                    )}

                    {user.role === "worker" && (
                      <Button
                        asChild
                        className="bg-blue-600 hover:bg-blue-700 shadow-md"
                      >
                        <Link href="/employee/orders">
                          <Truck className="h-4 w-4 mr-2" />
                          Панель работника
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Навигация */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button
            asChild
            variant="outline"
            className="shadow-md border-gray-300 hover:bg-gray-50"
          >
            <Link href="/orders">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Мои заказы
            </Link>
          </Button>
        </div>

        {/* Модальное окно подтверждения выхода */}
        <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <LogOut className="h-5 w-5" />
                Выход из аккаунта
              </DialogTitle>
              <DialogDescription className="text-base">
                Вы уверены, что хотите выйти из аккаунта?
                <br />
                <span className="text-sm text-gray-500 mt-2 block">
                  Вам потребуется снова войти в систему для доступа к профилю и
                  заказам.
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => setShowLogoutConfirm(false)}
                variant="outline"
              >
                Отмена
              </Button>
              <Button onClick={handleLogout} variant="destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Выйти
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
