"use client";

import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api-client";
import { ProductCard } from "./product-card";
import {
  DeliveryBatchesNav,
  type CatalogBatch,
} from "./delivery-batches-nav";
import { BatchProductsGrid } from "./batch-products-grid";

export function ProductsSection() {
  const [batches, setBatches] = useState<CatalogBatch[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [useGroupedView, setUseGroupedView] = useState(true);

  const activeBatch = useMemo(() => {
    if (!batches.length) return null;
    const idx = Math.min(activeBatchIndex, batches.length - 1);
    return batches[idx] ?? null;
  }, [batches, activeBatchIndex]);

  // Один запрос к Firestore для витрины (без гонки с отдельным fetch в навигации)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const { getFirestoreDb, getFirebaseApp } = await import("@/lib/firebase");
        getFirebaseApp();
        let db = getFirestoreDb();
        if (!db) {
          await new Promise((r) => setTimeout(r, 150));
          db = getFirestoreDb();
        }
        if (!db) {
          if (!cancelled) {
            setUseGroupedView(false);
            setBatches([]);
          }
          return;
        }
        const { getCatalogBatches } = await import("@/lib/gf-firestore/catalog");
        const res = await getCatalogBatches(db);
        if (cancelled) return;
        if (res?.success && Array.isArray(res.batches) && res.batches.length > 0) {
          setBatches(res.batches as CatalogBatch[]);
          setActiveBatchIndex(0);
          setUseGroupedView(true);
        } else {
          setUseGroupedView(false);
          setBatches([]);
        }
      } catch (e) {
        console.warn("Store catalog load failed:", e);
        if (!cancelled) {
          setCatalogError(
            e instanceof Error ? e.message : "Не удалось загрузить каталог",
          );
          setUseGroupedView(false);
          setBatches([]);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (batches.length && activeBatchIndex >= batches.length) {
      setActiveBatchIndex(0);
    }
  }, [batches, activeBatchIndex]);

  useEffect(() => {
    const handler = (e: CustomEvent<{ category?: string | null }>) => {
      setSelectedCategory(e.detail?.category ?? null);
    };
    window.addEventListener(
      "gf:filters:changed",
      handler as EventListener,
    );
    return () =>
      window.removeEventListener(
        "gf:filters:changed",
        handler as EventListener,
      );
  }, []);

  if (useGroupedView) {
    return (
      <div className="space-y-6">
        <DeliveryBatchesNav
          batches={batches}
          activeBatchIndex={Math.min(
            activeBatchIndex,
            Math.max(0, batches.length - 1),
          )}
          onActiveBatchIndexChange={setActiveBatchIndex}
          loading={catalogLoading}
          error={catalogError}
        />

        <BatchProductsGrid
          batch={activeBatch}
          loading={catalogLoading}
          selectedCategory={selectedCategory}
        />
      </div>
    );
  }

  return <ProductsSectionLegacy selectedCategory={selectedCategory} />;
}

function ProductsSectionLegacy({
  selectedCategory,
}: {
  selectedCategory: string | null;
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getAvailableInventoryItems();
        if (cancelled) return;
        if (res && res.success) {
          setProducts(res.data || []);
        } else {
          setProducts([]);
          setError(res?.error || "Ошибка при загрузке товаров");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          console.error("Error loading items:", e);
          setError(e instanceof Error ? e.message : "Ошибка сети");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = selectedCategory
    ? products.filter((p) => {
        const productCategory = String(p.category || "")
          .trim()
          .toLowerCase();
        const selectedCat = String(selectedCategory).trim().toLowerCase();
        return productCategory === selectedCat;
      })
    : products;

  if (loading)
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );

  if (error)
    return <div className="text-red-500 text-center py-10">{error}</div>;

  if (filtered.length === 0)
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">Товары не найдены</p>
        <p className="text-sm">Попробуйте другой фильтр</p>
      </div>
    );

  return (
    <div>
      {selectedCategory && (
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {selectedCategory}
          </h2>
          <p className="text-sm text-gray-500">{filtered.length} товаров</p>
        </div>
      )}
      <div className="space-y-3">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
