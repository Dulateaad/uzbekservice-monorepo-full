"use client";

import React, { useMemo } from "react";
import { ProductCard } from "./product-card";

interface BatchItem {
  id: number | string;
  name: string;
  variety?: string;
  quantity: number;
  selling_price: number;
  photo_url?: string;
  color?: string;
  category?: string;
  packaging_type?: string;
  stem_length?: string;
  height?: number | string | null;
  firestore_doc_id?: string;
  line_kind?: "product" | "inventory";
  truck_id?: string | null;
}

interface Batch {
  id: string | number;
  batch_date: string;
  supplier_name: string;
  total_items: number;
  age_days: number;
  is_fresh: boolean;
  is_new: boolean;
  status: string;
  items: BatchItem[];
}

interface BatchProductsGridProps {
  batch: Batch | null;
  loading?: boolean;
  selectedCategory?: string | null;
}

/**
 * Компонент отображения товаров из выбранной партии в виде сетки
 * Синхронизирован с DeliveryBatchesNav
 */
export function BatchProductsGrid({
  batch,
  loading = false,
  selectedCategory = null,
}: BatchProductsGridProps) {
  // Фильтровать товары по категории
  const filteredItems = useMemo(() => {
    if (!batch) return [];

    let items = batch.items || [];

    // Отладка: показываем все категории в фуре
    if (selectedCategory) {
      const batchCategories = [...new Set(items.map((i) => i.category))];
      console.log(
        `📦 Batch "${batch.batch_date}": Total items=${items.length}, Categories:`,
      );
      batchCategories.forEach((cat) => {
        console.log(
          `  - "${cat}" (lower: "${String(cat).toLowerCase().trim()}")`,
        );
      });
    }

    if (selectedCategory) {
      const normalizedSelected = String(selectedCategory).trim().toLowerCase();
      console.log(
        `🔍 Filtering by category: "${selectedCategory}" (lower: "${normalizedSelected}")`,
      );

      items = items.filter((item) => {
        const itemCat = String(item.category || "")
          .trim()
          .toLowerCase();
        const matches = itemCat === normalizedSelected;
        if (!matches) {
          console.warn(
            `  ❌ "${item.name}": category="${itemCat}" ≠ selected="${normalizedSelected}"`,
          );
        }
        return matches;
      });

      console.log(`   → Filtered items: ${items.length}`);
    }

    return items.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [batch, selectedCategory]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">Партия не выбрана</p>
        <p className="text-sm">Выберите партию из списка выше</p>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">Товары не найдены</p>
        {selectedCategory && (
          <p className="text-sm">
            Категория "{selectedCategory}" не имеет товаров в этой партии
          </p>
        )}
        <p className="text-sm">Всего товаров в партии: {batch.total_items}</p>
      </div>
    );
  }

  // Преобразовать элементы партии в формат товаров для ProductCard
  const products = filteredItems.map((item) => ({
    id: item.id,
    product_id: item.product_id ?? item.id,
    truck_id: item.truck_id ?? null,
    firestore_doc_id: item.firestore_doc_id,
    line_kind: item.line_kind,
    name: item.name,
    variety: item.variety,
    category: item.category || "Цветы",
    color: item.color || "различные",
    price_per_unit: item.selling_price,
    stock_quantity: item.quantity,
    image_url: item.photo_url,
    stem_length: item.stem_length,
    height: item.height || item.stem_length,
    packaging_type: item.packaging_type,
    batch_id: batch.id,
    batch_date: batch.batch_date,
    supplier_name: batch.supplier_name,
  }));

  // Форматировать дату партии
  const formatBatchDate = () => {
    try {
      let dateObj = new Date(batch.batch_date);
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date(batch.batch_date?.split("T")[0]);
      }
      if (isNaN(dateObj.getTime())) {
        return "Партия";
      }
      const formatted = dateObj.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      });
      return `Товары - ${formatted}`;
    } catch (e) {
      return "Товары в партии";
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between" translate="no">
        <h2 className="text-base font-medium text-gray-800">
          {formatBatchDate()}
        </h2>
        <p className="text-[11px] text-gray-500">
          {filteredItems.length} позиций
        </p>
      </div>

      {/* Сетка товаров */}
      <div className="space-y-3">
        {products.map((product, idx) => (
          <ProductCard
            key={`product-${batch.id}-${product.id}-${idx}`}
            product={product}
          />
        ))}
      </div>
    </div>
  );
}
