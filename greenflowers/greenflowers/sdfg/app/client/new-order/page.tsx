"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/contexts/auth-context";
import { kazakhstanCities } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";

export default function NewOrderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [cityId, setCityId] = useState(user?.city || "");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [cart, setCart] = useState<{ productId: number; quantity: number }[]>(
    [],
  );
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.getProducts();
        if (response.success) {
          setProducts(response.products);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categoryNames: Record<string, string> = {
    all: "Все",
    roses: "Розы",
    chrysanthemums: "Хризантемы",
    carnations: "Гвоздики",
    gypsophila: "Гипсофила",
    lilies: "Лилии",
    gerberas: "Герберы",
    other: "Другое",
  };

  /** Категории из реальных товаров + стандартный набор, чтобы «Другое» и кастомные поля не пропадали из фильтра */
  const categories = useMemo(() => {
    const fromDb = new Set<string>();
    for (const p of products) {
      const c = p.category != null ? String(p.category).trim() : "";
      if (c) fromDb.add(c);
    }
    const preset = [
      "roses",
      "chrysanthemums",
      "carnations",
      "gypsophila",
      "lilies",
      "gerberas",
      "other",
    ];
    const merged = new Set<string>(["all", ...preset]);
    fromDb.forEach((c) => merged.add(c));
    return Array.from(merged);
  }, [products]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (productId: number) => {
    const existing = cart.find((c) => c.productId === productId);
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (existing) {
      setCart(
        cart.map((c) =>
          c.productId === productId ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
    } else {
      setCart([
        ...cart,
        { productId, quantity: product.min_order_quantity || 1 },
      ]);
    }
  };

  const updateQuantity = (productId: number, quantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (quantity < (product.min_order_quantity || 1)) {
      setCart(cart.filter((c) => c.productId !== productId));
    } else {
      setCart(
        cart.map((c) => (c.productId === productId ? { ...c, quantity } : c)),
      );
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + (product?.price_per_unit || 0) * item.quantity;
    }, 0);
  };

  const getMinDeliveryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 10); // Min 10 days from now
    return date.toISOString().split("T")[0];
  };

  const handleSubmit = async () => {
    if (!cityId || !deliveryDate || cart.length === 0 || !user?.id) return;

    try {
      const items = cart.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      }));

      const orderData = {
        userId: user.id,
        items,
        delivery_city:
          kazakhstanCities.find((c) => c.id === cityId)?.name.ru || cityId,
        delivery_address: user.city || "",
        delivery_date: deliveryDate,
        payment_method: "kaspi_qr",
        notes,
      };

      await api.createOrder(orderData);
      router.push("/client");
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Ошибка при создании заказа");
    }
  };

  return (
    <DashboardLayout title="Новый заказ" requiredRole="user">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s
                    ? "bg-[#568a56] text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${step > s ? "bg-[#568a56]" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-12 mt-2 text-sm text-gray-500">
          <span>Доставка</span>
          <span>Товары</span>
          <span>Подтверждение</span>
        </div>
      </div>

      {/* Step 1: Delivery */}
      {step === 1 && (
        <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Данные доставки
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="city">Город доставки</Label>
              <select
                id="city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background"
                required
              >
                <option value="">Выберите город</option>
                {kazakhstanCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.ru}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="date">Желаемая дата доставки</Label>
              <Input
                id="date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={getMinDeliveryDate()}
                className="mt-1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Минимум 10 дней с момента заказа
              </p>
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!cityId || !deliveryDate}
              className="w-full bg-[#568a56] hover:bg-[#457245]"
            >
              Далее — Выбор товаров
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Products */}
      {step === 2 && (
        <div>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Products Grid */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Input
                  placeholder="Поиск товаров..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryNames[cat] ?? cat}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-[#568a56] border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-500 mt-4">Загрузка товаров...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((c) => c.productId === product.id);
                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4"
                      >
                        <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span className="text-xl text-gray-400">
                              Нет изображения
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {product.packaging_type}
                          </p>
                          <p className="text-lg font-bold text-[#568a56]">
                            {product.price_per_unit?.toLocaleString()} KZT
                          </p>
                          {inCart ? (
                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                type="number"
                                value={inCart.quantity}
                                onChange={(e) =>
                                  updateQuantity(
                                    product.id,
                                    Number.parseInt(e.target.value) || 0,
                                  )
                                }
                                min={product.min_order_quantity || 1}
                                className="w-20"
                              />
                              <span className="text-sm text-gray-500">шт.</span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => addToCart(product.id)}
                              className="mt-2 bg-[#568a56]"
                            >
                              + Добавить
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart Sidebar */}
            <div className="lg:w-80">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                <h3 className="font-bold text-gray-900 mb-4">Корзина</h3>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-sm">Добавьте товары</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {cart.map((item) => {
                        const product = products.find(
                          (p) => p.id === item.productId,
                        );
                        if (!product) return null;
                        return (
                          <div
                            key={item.productId}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-gray-600">
                              {product.name.slice(0, 20)}... x{item.quantity}
                            </span>
                            <span className="font-medium">
                              {(
                                (product.price_per_unit || 0) * item.quantity
                              ).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t pt-4 mb-4">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Итого:</span>
                        <span className="text-[#568a56]">
                          {getCartTotal().toLocaleString()} KZT
                        </span>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Назад
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={cart.length === 0}
                    className="flex-1 bg-[#568a56] hover:bg-[#457245]"
                  >
                    Далее
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Подтверждение заказа
          </h2>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Город доставки:</span>
              <span className="font-medium">
                {kazakhstanCities.find((c) => c.id === cityId)?.name.ru}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Дата доставки:</span>
              <span className="font-medium">{deliveryDate}</span>
            </div>
            <div className="py-2 border-b">
              <p className="text-gray-500 mb-2">Товары:</p>
              {cart.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                if (!product) return null;
                return (
                  <div
                    key={item.productId}
                    className="flex justify-between text-sm py-1"
                  >
                    <span>
                      {product.name} x {item.quantity} шт.
                    </span>
                    <span>
                      {(
                        (product.price_per_unit || 0) * item.quantity
                      ).toLocaleString()}{" "}
                      KZT
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between py-2 text-xl font-bold">
              <span>Итого:</span>
              <span className="text-[#568a56]">
                {getCartTotal().toLocaleString()} KZT
              </span>
            </div>
          </div>

          <div className="mb-6">
            <Label htmlFor="notes">Примечания к заказу (необязательно)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background min-h-[100px]"
              placeholder="Особые пожелания, время доставки и т.д."
            />
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="flex-1"
            >
              Назад
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-[#568a56] hover:bg-[#457245]"
            >
              Оформить заказ
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
