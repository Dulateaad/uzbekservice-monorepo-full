"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";

interface Flower {
  id: number;
  name: string;
  category: string;
  color: string;
  variety: string;
  description: string;
  price_per_unit: number;
  price_per_box: number;
  stock_quantity: number;
  min_order_quantity: number;
  stem_length: string;
  packaging_type: string;
  image_url: string;
  next_delivery_date: string;
}

export default function EmployeeFlowersPage() {
  const { user } = useAuth();
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFlower, setEditingFlower] = useState<Flower | null>(null);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    color: "",
    variety: "",
    description: "",
    price_per_unit: "",
    price_per_box: "",
    stock_quantity: "",
    min_order_quantity: "",
    stem_length: "",
    packaging_type: "",
    image_url: "",
    next_delivery_date: "",
  });

  useEffect(() => {
    fetchFlowers();
  }, []);

  const fetchFlowers = async () => {
    try {
      const response = await api.getFlowers();
      if (response.success) {
        setFlowers(response.products);
      }
    } catch (error) {
      console.error("Error fetching flowers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (flower?: Flower) => {
    if (flower) {
      setEditingFlower(flower);
      setFormData({
        name: flower.name,
        category: flower.category,
        color: flower.color,
        variety: flower.variety || "",
        description: flower.description || "",
        price_per_unit: flower.price_per_unit.toString(),
        price_per_box: flower.price_per_box?.toString() || "",
        stock_quantity: flower.stock_quantity.toString(),
        min_order_quantity: flower.min_order_quantity.toString(),
        stem_length: flower.stem_length || "",
        packaging_type: flower.packaging_type || "",
        image_url: flower.image_url || "",
        next_delivery_date: flower.next_delivery_date || "",
      });
    } else {
      setEditingFlower(null);
      setFormData({
        name: "",
        category: "roses",
        color: "",
        variety: "",
        description: "",
        price_per_unit: "",
        price_per_box: "",
        stock_quantity: "0",
        min_order_quantity: "50",
        stem_length: "",
        packaging_type: "",
        image_url: "",
        next_delivery_date: "",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const flowerData = {
        name: formData.name,
        category: formData.category,
        color: formData.color,
        variety: formData.variety,
        description: formData.description,
        price_per_unit: parseFloat(formData.price_per_unit),
        price_per_box: parseFloat(formData.price_per_box) || null,
        stock_quantity: parseInt(formData.stock_quantity),
        min_order_quantity: parseInt(formData.min_order_quantity),
        stem_length: formData.stem_length,
        packaging_type: formData.packaging_type,
        image_url: formData.image_url,
        next_delivery_date: formData.next_delivery_date || null,
      };

      if (editingFlower) {
        await api.updateFlower(user.id, editingFlower.id, flowerData);
      } else {
        await api.createFlower(user.id, flowerData);
      }

      setShowModal(false);
      fetchFlowers();
    } catch (error) {
      console.error("Error saving flower:", error);
      alert("Ошибка при сохранении");
    }
  };

  const filteredFlowers = flowers.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const categories = [
    { value: "roses", label: "Розы" },
    { value: "chrysanthemums", label: "Хризантемы" },
    { value: "carnations", label: "Гвоздики" },
    { value: "lilies", label: "Лилии" },
    { value: "gerberas", label: "Герберы" },
    { value: "gypsophila", label: "Гипсофила" },
  ];

  return (
    <DashboardLayout title="Управление цветами" requiredRole="worker">
      <div className="flex justify-between items-center mb-6">
        <Input
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          onClick={() => handleOpenModal()}
          className="bg-[#568a56] hover:bg-[#457245]"
        >
          + Добавить цветок
        </Button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#568a56] border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">Загрузка...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlowers.map((flower) => (
            <div
              key={flower.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex gap-3 mb-3">
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  {flower.image_url ? (
                    <img
                      src={flower.image_url}
                      alt={flower.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-xs text-gray-500">
                      Без изображения
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {flower.name}
                  </h3>
                  <p className="text-sm text-gray-500">{flower.color}</p>
                  <p className="text-sm text-gray-500">{flower.variety}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Цена за шт:</span>
                  <span className="font-medium">
                    {flower.price_per_unit} KZT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">В наличии:</span>
                  <span>{flower.stock_quantity} шт.</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal(flower)}
                  className="flex-1"
                >
                  Изменить
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (!user?.id) return;
                    if (!confirm(`Удалить ${flower.name}?`)) return;
                    try {
                      await api.deleteFlower(user.id, flower.id);
                      fetchFlowers();
                    } catch (error) {
                      console.error("Error deleting flower:", error);
                      alert("Ошибка при удалении");
                    }
                  }}
                  className="flex-1"
                >
                  Удалить
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingFlower
                  ? "Редактировать цветок"
                  : "Добавить новый цветок"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Название *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Категория *</Label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-input rounded-md"
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Цвет *</Label>
                    <Input
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      placeholder="Красный, белый..."
                      required
                    />
                  </div>
                  <div>
                    <Label>Сорт</Label>
                    <Input
                      value={formData.variety}
                      onChange={(e) =>
                        setFormData({ ...formData, variety: e.target.value })
                      }
                      placeholder="Red Pearl..."
                    />
                  </div>
                  <div>
                    <Label>Цена за штуку (KZT) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price_per_unit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_per_unit: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Цена за коробку (KZT)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price_per_box}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_per_box: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Количество на складе *</Label>
                    <Input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock_quantity: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Минимальный заказ *</Label>
                    <Input
                      type="number"
                      value={formData.min_order_quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          min_order_quantity: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Длина стебля</Label>
                    <Input
                      value={formData.stem_length}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stem_length: e.target.value,
                        })
                      }
                      placeholder="60cm"
                    />
                  </div>
                  <div>
                    <Label>Тип упаковки</Label>
                    <Input
                      value={formData.packaging_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          packaging_type: e.target.value,
                        })
                      }
                      placeholder="Box of 50"
                    />
                  </div>
                  <div>
                    <Label>URL изображения</Label>
                    <Input
                      value={formData.image_url}
                      onChange={(e) =>
                        setFormData({ ...formData, image_url: e.target.value })
                      }
                      placeholder="/red-roses.jpg"
                    />
                  </div>
                  <div>
                    <Label>Дата следующей поставки</Label>
                    <Input
                      type="date"
                      value={formData.next_delivery_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          next_delivery_date: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Описание</Label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-input rounded-md min-h-[100px]"
                    placeholder="Описание цветка..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#568a56] hover:bg-[#457245]"
                  >
                    {editingFlower ? "Сохранить изменения" : "Добавить цветок"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
