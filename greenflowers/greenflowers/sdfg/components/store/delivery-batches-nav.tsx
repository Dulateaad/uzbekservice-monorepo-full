"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Truck, Package } from "lucide-react";

interface BatchItem {
  id: number | string;
  name: string;
  variety?: string;
  quantity: number;
  selling_price: number;
  photo_url?: string;
  color?: string;
}

export interface CatalogBatch {
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

interface DeliveryBatchesNavProps {
  batches: CatalogBatch[];
  activeBatchIndex: number;
  onActiveBatchIndexChange: (index: number) => void;
  loading?: boolean;
  error?: string | null;
}

export function DeliveryBatchesNav({
  batches,
  activeBatchIndex,
  onActiveBatchIndexChange,
  loading = false,
  error = null,
}: DeliveryBatchesNavProps) {
  const handlePrev = () => {
    if (activeBatchIndex > 0) {
      onActiveBatchIndexChange(activeBatchIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeBatchIndex < batches.length - 1) {
      onActiveBatchIndexChange(activeBatchIndex + 1);
    }
  };

  const activeBatch = batches[activeBatchIndex];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded flex-1"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!batches.length) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
        <p>Нет доступных товаров</p>
      </div>
    );
  }

  const isTruck = (batch: CatalogBatch) => batch.id !== "catalog" && batch.id !== "all";

  const getBatchLabel = (batch: CatalogBatch) => {
    if (!isTruck(batch)) return batch.supplier_name;
    return batch.supplier_name || `Фура ${batch.id}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeBatchIndex === 0}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          {activeBatch && (
            <div className="flex-1 text-center space-y-2">
              <div className="flex items-center justify-center gap-2" translate="no">
                {isTruck(activeBatch) ? (
                  <Truck className="w-5 h-5 text-green-600" />
                ) : (
                  <Package className="w-5 h-5 text-green-600" />
                )}
                <span className="text-lg font-semibold text-gray-800">
                  {getBatchLabel(activeBatch)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-3 text-sm" translate="no">
                {isTruck(activeBatch) && formatDate(activeBatch.batch_date) && (
                  <span className="text-gray-500">
                    Прибытие: {formatDate(activeBatch.batch_date)}
                  </span>
                )}
                <span className="text-gray-500">
                  {activeBatchIndex + 1} из {batches.length}
                </span>
                <span className="text-gray-500">
                  {activeBatch.total_items} товаров
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={activeBatchIndex === batches.length - 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" translate="no">
          {batches.map((batch, idx) => (
            <button
              type="button"
              key={`batch-${batch.id}-${idx}`}
              onClick={() => onActiveBatchIndexChange(idx)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                idx === activeBatchIndex
                  ? "bg-green-700 text-white shadow-md"
                  : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {isTruck(batch) ? (
                <Truck className="w-3.5 h-3.5" />
              ) : (
                <Package className="w-3.5 h-3.5" />
              )}
              {getBatchLabel(batch)}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-green-600 flex-shrink-0" />
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap flex-shrink-0">
              Выбор фуры:
            </label>
            <select
              value={activeBatchIndex}
              onChange={(e) => onActiveBatchIndexChange(Number(e.target.value))}
              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 truncate"
            >
              {batches.map((batch, idx) => (
                <option key={`batch-${batch.id}-${idx}`} value={idx} className="truncate">
                  {getBatchLabel(batch)} — {batch.total_items} тов.
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
