"use client";

import React, { useState } from "react";
import { Edit2, Trash2, ImageOff } from "lucide-react";
import Image from "next/image";

interface InventoryItem {
  id: number;
  name: string;
  variety: string;
  quantity: number;
  price: number;
  photo_url?: string;
  category?: string;
  height?: number;
}

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (itemId: number) => void;
  onUpdateQuantity?: (itemId: number, quantity: number) => Promise<void>;
  onUpdatePrice?: (itemId: number, price: number) => Promise<void>;
  onUpdateCategory?: (itemId: number, category: string | null) => Promise<void>;
  onUpdateHeight?: (itemId: number, height: number | null) => Promise<void>;
  categories?: string[];
  isLoading?: boolean;
  searchTerm?: string;
  filterVariety?: string;
  filterCategory?: string;
  // optional sorting controls
  sortField?: "price" | "quantity";
  sortOrder?: "asc" | "desc";
  canEditPosition?: boolean;
  canEditTruck?: boolean;
}

export default function InventoryTable({
  items,
  onEdit,
  onDelete,
  onUpdateQuantity,
  onUpdatePrice,
  onUpdateCategory,
  onUpdateHeight,
  categories = [],
  isLoading = false,
  searchTerm = "",
  filterVariety = "",
  filterCategory = "",
  sortField,
  sortOrder = "desc",
  canEditPosition = true,
  canEditTruck = true,
}: InventoryTableProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null,
  );
  const [editingId, setEditingId] = useState<number | null>(null);

  // Helper function to get full image URL — trust backend, use absolute URLs directly
  const getImageUrl = (photoUrl: string | undefined) => {
    if (!photoUrl) return null;
    // Backend now returns absolute URLs; if it starts with http, use as-is
    if (photoUrl.startsWith("http")) return photoUrl;
    // Fallback for relative paths (shouldn't happen with new API)
    const apiBase = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/api\/?$/, "");
    return `${apiBase}${photoUrl}`;
  };

  // Filter and sort items
  let filteredItems = items;

  if (searchTerm) {
    filteredItems = filteredItems.filter((item) =>
      item.name.toLowerCase().startsWith(searchTerm.toLowerCase()),
    );
  }

  if (filterVariety) {
    filteredItems = filteredItems.filter((item) =>
      item.variety?.toLowerCase().includes(filterVariety.toLowerCase()),
    );
  }

  if (filterCategory) {
    const normalized = String(filterCategory).toLowerCase().trim();
    filteredItems = filteredItems.filter(
      (item) =>
        String(item.category || "")
          .toLowerCase()
          .trim() === normalized,
    );
  }

  // apply simple sort if requested
  if (sortField) {
    if (sortField === "price") {
      filteredItems = filteredItems.sort((a, b) =>
        sortOrder === "asc" ? a.price - b.price : b.price - a.price,
      );
    } else if (sortField === "quantity") {
      filteredItems = filteredItems.sort((a, b) =>
        sortOrder === "asc" ? a.quantity - b.quantity : b.quantity - a.quantity,
      );
    }
  }

  // Уберём дубликаты по `id`, чтобы избежать проблем с ключами и подсчётом
  const uniqueFilteredItems = filteredItems.filter(
    (item, idx, arr) => arr.findIndex((t) => t.id === item.id) === idx,
  );

  const totalCost = uniqueFilteredItems.reduce(
    (sum, item) => sum + item.quantity * parseFloat(item.price as any),
    0,
  );
  const totalQuantity = uniqueFilteredItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const totalItems = uniqueFilteredItems.length;

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <ImageOff className="mx-auto w-12 h-12 text-gray-400 mb-3" />
        <p className="text-gray-600">Товаров не добавлено</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white">
          <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-900 w-16">
                Фото
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Название
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Категория
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900 w-20">
                Высота (см)
              </th>
              <th className="px-6 py-3 text-right font-semibold text-gray-900 w-24">
                Кол-во
              </th>
              <th className="px-6 py-3 text-right font-semibold text-gray-900 w-24">
                Цена
              </th>
              <th className="px-6 py-3 text-right font-semibold text-gray-900 w-32">
                Сумма
              </th>
              <th className="px-6 py-3 text-center font-semibold text-gray-900 w-20">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {uniqueFilteredItems.map((item, index) => (
              <tr
                key={`${item.id}-${index}`}
                className={`transition-colors group border-b border-gray-100 ${index % 2 === 0 ? "bg-[#FAFAFA]" : ""} hover:bg-gray-50`}
              >
                {/* Photo */}
                <td className="px-6 py-5">
                  {item.photo_url ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border border-[#E5E7EB]">
                      <Image
                        src={getImageUrl(item.photo_url) || ""}
                        alt={item.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          console.warn(
                            "Image failed to load:",
                            item.photo_url,
                            "| Fallback:",
                            getImageUrl(item.photo_url),
                          );
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-100 border border-[#E5E7EB] flex items-center justify-center">
                      <ImageOff className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </td>

                {/* Name */}
                <td className="px-6 py-5 font-medium text-gray-900">
                  {item.name}
                </td>

                {/* Category */}
                <td className="px-6 py-5 text-gray-600 text-sm">
                  {onUpdateCategory ? (
                    editingId === item.id ? (
                      categories && categories.length > 0 ? (
                        <select
                          defaultValue={item.category || ""}
                          onChange={(e) => {
                            const v = String(e.target.value).trim();
                            onUpdateCategory(item.id, v === "" ? null : v);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#568a56]"
                        >
                          <option value="">—</option>
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          defaultValue={item.category || ""}
                          onBlur={(e) => {
                            const v = String(e.target.value).trim();
                            onUpdateCategory(item.id, v === "" ? null : v);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#568a56]"
                        />
                      )
                    ) : (
                      item.category || "—"
                    )
                  ) : (
                    item.category || "—"
                  )}
                </td>

                {/* Height */}
                <td className="px-6 py-5 text-gray-600 text-sm">
                  {onUpdateHeight ? (
                    editingId === item.id ? (
                      <input
                        type="number"
                        defaultValue={
                          item.height !== null && item.height !== undefined
                            ? String(item.height)
                            : ""
                        }
                        onBlur={(e) => {
                          const raw = String(e.target.value).trim();
                          if (raw === "") {
                            onUpdateHeight(item.id, null);
                            return;
                          }
                          const n = parseFloat(raw);
                          if (!isNaN(n)) onUpdateHeight(item.id, n);
                        }}
                        step="0.01"
                        min="0"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#568a56]"
                      />
                    ) : item.height ? (
                      parseFloat(String(item.height)).toFixed(2)
                    ) : (
                      "—"
                    )
                  ) : item.height ? (
                    parseFloat(String(item.height)).toFixed(2)
                  ) : (
                    "—"
                  )}
                </td>

                {/* Quantity */}
                <td className="px-6 py-5 text-right font-medium text-gray-900">
                  {onUpdateQuantity ? (
                    editingId === item.id ? (
                      <input
                        type="number"
                        defaultValue={String(item.quantity)}
                        onBlur={(e) => {
                          const qty =
                            parseInt(String(e.target.value).trim()) || 0;
                          if (qty >= 0) {
                            onUpdateQuantity(item.id, qty);
                          }
                        }}
                        min="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#568a56]"
                      />
                    ) : (
                      item.quantity
                    )
                  ) : (
                    item.quantity
                  )}
                </td>

                {/* Price */}
                <td className="px-6 py-5 text-right text-gray-900">
                  {onUpdatePrice ? (
                    editingId === item.id ? (
                      <input
                        type="number"
                        defaultValue={parseFloat(item.price as any).toFixed(2)}
                        onBlur={(e) => {
                          const p =
                            parseFloat(String(e.target.value).trim()) || 0;
                          if (p >= 0) {
                            onUpdatePrice(item.id, p);
                          }
                        }}
                        step="0.01"
                        min="0"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-[#568a56]"
                      />
                    ) : (
                      `₸${parseFloat(item.price as any).toFixed(2)}`
                    )
                  ) : (
                    `₸${parseFloat(item.price as any).toFixed(2)}`
                  )}
                </td>

                {/* Total */}
                <td className="px-6 py-5 text-right font-semibold text-[#568a56]">
                  ₸{(item.quantity * parseFloat(item.price as any)).toFixed(2)}
                </td>

                {/* Actions */}
                <td className="px-6 py-5">
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEditPosition && (
                      <button
                        onClick={() => {
                          // Toggle edit mode for this row
                          setEditingId(editingId === item.id ? null : item.id);
                        }}
                        className="text-blue-600 hover:bg-blue-50 transition-colors p-2 rounded-lg"
                        title="Редактировать"
                        disabled={isLoading}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canEditTruck && (
                      <button
                        onClick={() => setShowDeleteConfirm(item.id)}
                        className="text-red-600 hover:bg-red-50 transition-colors p-2 rounded-lg"
                        title="Удалить"
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center text-sm">
        <div className="text-gray-600">
          Позиций:{" "}
          <span className="font-semibold text-gray-900">{totalItems}</span>
        </div>
        <div className="text-gray-600">
          Кол-во:{" "}
          <span className="font-semibold text-gray-900">
            {totalQuantity} шт.
          </span>
        </div>
        <div className="text-gray-600">
          Сумма:{" "}
          <span className="font-semibold text-[#568a56]">
            ₸{totalCost.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Confirm delete modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Удалить товар?
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              Это действие невозможно отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onDelete(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
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
