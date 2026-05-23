"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { X, Trash2, Plus } from "lucide-react";

interface Product {
  id: number;
  name: string;
  variety?: string;
  price: number;
  photo_url?: string;
  category?: string | null;
  height?: number | string | null;
}

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => Promise<void>;
  onDelete: (productId: number) => Promise<void>;
  truckId: string;
}

export default function ProductCatalogModal({
  isOpen,
  onClose,
  onSelect,
  onDelete,
  truckId,
}: ProductCatalogModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [selectedForAdd, setSelectedForAdd] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");
      // Загружаем товары из API
      const res: any = await api.getProducts();
      if (res && res.success && Array.isArray(res.products)) {
        // Приведём к локальной форме: поддерживаем image_url или photo_url
        // Включаем category и height чтобы при добавлении из каталога эти поля шли на склад
        const mapped = res.products.map((p: any) => {
          const rawCat = p.category;
          const normalizedCat =
            rawCat && String(rawCat).trim().toLowerCase() !== "uncategorized"
              ? rawCat
              : null;

          return {
            id: p.id,
            name: p.name,
            variety: p.variety,
            price: p.price_per_unit || p.price || p.price_per_box || 0,
            photo_url: p.image_url || p.photo_url || null,
            category: normalizedCat,
            height: p.height || null,
          };
        });
        setProducts(mapped as any);
      } else if (Array.isArray(res)) {
        setProducts(res as any);
      } else {
        setProducts([]);
      }
    } catch (err) {
      setError("Ошибка загрузки каталога");
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (photoUrl?: string) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("http")) return photoUrl;
    // derive base API URL without /api
    const apiBase = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/api\/?$/, "");
    return `${apiBase}${photoUrl}`;
  };

  const handleSelect = async (product: Product) => {
    try {
      setSelectedForAdd(product.id);
      await onSelect(product);
      setSelectedForAdd(null);
      // Перезагружаем список после добавления
      await loadProducts();
    } catch (err) {
      setError("Ошибка при добавлении товара");
      setSelectedForAdd(null);
    }
  };

  const handleDelete = async (productId: number) => {
    try {
      setDeleteConfirm(null);
      await onDelete(productId);
      setProducts(products.filter((p) => p.id !== productId));
    } catch (err) {
      setError("Ошибка при удалении товара");
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
            <h2 className="text-xl font-semibold text-gray-900">
              Каталог товаров
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-[#568a56] border-t-transparent rounded-full" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  Товаров в каталоге нет. Создайте первый товар.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-[#568a56] transition-colors group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {product.photo_url ? (
                        <img
                          src={getImageUrl(product.photo_url) || undefined}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg bg-gray-100"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100" />
                      )}

                      <div>
                        <h3 className="font-medium text-gray-900">
                          {product.name}
                        </h3>
                        {product.variety && (
                          <p className="text-sm text-gray-600">
                            {product.variety}
                          </p>
                        )}
                        <p className="text-sm text-[#568a56] font-medium">
                          {product.price} ₸
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleSelect(product)}
                        disabled={selectedForAdd === product.id}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-[#568a56] hover:bg-[#457245] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        Добавить
                      </button>

                      <button
                        onClick={() => setDeleteConfirm(product.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete Confirmation */}
          {deleteConfirm !== null && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Удалить товар?
                </h3>
                <p className="text-gray-600 mb-6">
                  Это действие нельзя отменить.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
