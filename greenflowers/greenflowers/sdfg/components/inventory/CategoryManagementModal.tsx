"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function CategoryManagementModal({
  isOpen,
  onClose,
  onRefresh,
}: CategoryManagementModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.getFlowerCategories();
      if (response.success === false) {
        throw new Error(response.error || "Failed to load categories");
      }
      setCategories(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newCategoryName.trim()) {
      setError("Введите имя категории");
      return;
    }

    try {
      setLoading(true);
      const response = await api.createFlowerCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
      });

      if (response.success === false) {
        throw new Error(response.error || "Failed to create category");
      }

      setCategories([response.data, ...categories]);
      setNewCategoryName("");
      setNewCategoryDescription("");
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating category");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Вы уверены, что хотите удалить эту категорию?")) {
      return;
    }

    try {
      setDeleting(id);
      setError("");
      const response = await api.deleteFlowerCategory(id);

      if (response.success === false) {
        throw new Error(response.error || "Failed to delete category");
      }

      setCategories(categories.filter((cat) => cat.id !== id));
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting category");
    } finally {
      setDeleting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
            <h2 className="text-xl font-semibold text-gray-900">
              Управление категориями
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Add Category Form */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Добавить новую</h3>
              <form onSubmit={handleAddCategory} className="space-y-3">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Имя категории
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Например: Розы, Тюльпаны"
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание (опционально)
                  </label>
                  <input
                    type="text"
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    placeholder="Краткое описание"
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#568a56] disabled:bg-gray-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-[#568a56] text-white rounded-lg hover:bg-[#457245] font-medium transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? "Добавление..." : "Добавить"}
                </button>
              </form>
            </div>

            {/* Categories List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">
                Существующие категории ({categories.length})
              </h3>
              {categories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Категории не добавлены
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {cat.description}
                          </p>
                        )}
                      </div>
                      {cat.id > 0 ? (
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          disabled={deleting === cat.id || loading}
                          className="text-red-600 hover:bg-red-50 transition-colors p-2 rounded-lg disabled:opacity-50"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span
                          className="text-xs text-gray-400 max-w-[7rem] text-right"
                          title="Категория только из товаров — удаление из справочника недоступно"
                        >
                          из товаров
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex gap-3 p-6 border-t border-gray-200 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
