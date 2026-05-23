"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Settings } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api-client";
import CategoryManagementModal from "./CategoryManagementModal";

interface AddPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  truckId: string;
}

interface Category {
  id: number;
  name: string;
}

export default function AddPositionModal({
  isOpen,
  onClose,
  onSubmit,
  truckId,
}: AddPositionModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    quantity: 1,
    unit_price: "",
    category: "",
    height: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await api.getFlowerCategories();
      if (response.success === false) {
        console.error("Failed to fetch categories:", response.error);
        return;
      }
      setCategories(response.data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Выберите изображение");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Размер файла не должен превышать 5МБ");
      return;
    }

    setFileName(file.name);
    setError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 0 : value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Введите название позиции");
      return;
    }

    if (formData.quantity < 1) {
      setError("Количество должно быть минимум 1");
      return;
    }

    if (!formData.unit_price) {
      setError("Введите цену");
      return;
    }

    if (!fileInputRef.current?.files?.[0]) {
      setError("Загрузите изображение");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();
      data.append("name", formData.name);
      data.append("quantity", String(formData.quantity));
      data.append("price", formData.unit_price);
      data.append("truck_id", truckId);
      if (formData.category) {
        data.append("category", formData.category);
      }
      if (formData.height) {
        data.append("height", formData.height);
      }
      if (fileInputRef.current?.files[0]) {
        data.append("photo", fileInputRef.current.files[0]);
      }

      await onSubmit(data);

      // Reset form
      setFormData({
        name: "",
        quantity: 1,
        unit_price: "",
        category: "",
        height: "",
      });
      setPreview("");
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка при добавлении позиции",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
            <h2 className="text-xl font-semibold text-gray-900">
              Добавить позицию
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Image Preview */}
            {preview ? (
              <div className="relative group">
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreview("");
                    setFileName("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#568a56] hover:bg-[#568a56]/5 transition-all"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  Загрузите изображение
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  До 5МБ, PNG, JPG, WebP
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название позиции
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Например: Роза красная"
                disabled={loading}
                autoFocus
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] transition-all disabled:bg-gray-50"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Цена за единицу
              </label>
              <input
                type="number"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] transition-all disabled:bg-gray-50"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Категория (опционально)
              </label>
              <div className="flex gap-2">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] transition-all disabled:bg-gray-50"
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-[#F9FAFB] border border-[#D1D5DB] hover:bg-[#F3F4F6] text-gray-700 rounded-lg transition-colors disabled:bg-gray-100 flex items-center gap-2 whitespace-nowrap"
                  title="Управлять категориями"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Высота цветка (см, опционально)
              </label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] transition-all disabled:bg-gray-50"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="sticky bottom-0 flex gap-3 p-6 border-t border-gray-200 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#568a56] text-white rounded-lg hover:bg-[#457245] font-medium transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? "Добавление..." : "Добавить"}
            </button>
          </div>
        </div>
      </div>

      {/* Nested Category Management Modal */}
      {showCategoryModal && (
        <CategoryManagementModal
          isOpen={showCategoryModal}
          onClose={() => {
            setShowCategoryModal(false);
            // Перезагружаем категории при закрытии
            fetchCategories();
          }}
          onRefresh={() => {
            // Перезагружаем категории после изменений
            fetchCategories();
          }}
        />
      )}
    </>
  );
}
