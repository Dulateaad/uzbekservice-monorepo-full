"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api-client";

export function StoreFilters() {
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.getAvailableInventoryCategories();
      console.log("Categories response:", response);
      if (response.success && response.data) {
        const cats = response.data.map((cat: any) => {
          const name = cat.name || "";
          console.log(`  - Category: "${name}" (length: ${name.length})`);
          return name;
        });
        console.log(
          `Loaded ${cats.length} categories:`,
          cats.map((c) => `"${c}"`),
        );
        setCategories(cats);
      } else {
        console.warn("No categories data in response");
        setCategories([]);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (c: string) => {
    const newCategory = category === c ? null : c;
    console.log(`🎯 Category clicked: "${c}"`);
    console.log(
      `   → New category: "${newCategory}" (lower: "${String(newCategory).toLowerCase().trim()}")`,
    );
    setCategory(newCategory);
    window.dispatchEvent(
      new CustomEvent("gf:filters:changed", {
        detail: { category: newCategory },
      }),
    );
  };

  return (
    <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm md:sticky md:top-[90px]">
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <h3 className="font-bold text-base md:text-lg">Категории</h3>
      </div>
      <div className="block">
        {loading ? (
          <div className="text-center py-3 md:py-4 text-gray-500">
            <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-gray-300 border-t-[#2f6f4a] rounded-full animate-spin mx-auto" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-3 md:py-4 text-gray-500 text-sm">
            Нет товаров на складе
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 md:gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => handleCategoryClick(c)}
                className={`text-left px-3 py-2 md:px-4 md:py-3 rounded-lg text-sm md:text-base font-medium transition-all ${
                  category === c
                    ? "bg-[#2f6f4a] text-white shadow"
                    : "bg-gray-50 text-gray-800 hover:bg-gray-100"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {category && (
          <button
            onClick={() => handleCategoryClick(category)}
            className="w-full mt-4 text-sm text-[#2f6f4a] border border-[#2f6f4a] py-2 rounded-lg hover:bg-green-50 transition"
          >
            Сброс фильтра
          </button>
        )}
      </div>
    </div>
  );
}
