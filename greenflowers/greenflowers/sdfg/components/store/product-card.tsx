"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useCart } from "@/contexts/cart-context";
import { ImageOff } from "lucide-react";

export function ProductCard({ product }: { product: any }) {
  const { addToCart } = useCart();
  const [adding, setAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const onAdd = async () => {
    if (product.stock_quantity <= 0) {
      alert("Товар отсутствует на складе");
      return;
    }
    console.log("[ProductCard] Adding product:", {
      id: product.id,
      product_id: product.product_id,
      truck_id: product.truck_id,
      name: product.name,
      batch_date: product.batch_date,
      full_product: product,
    });
    setAdding(true);
    try {
      await addToCart(product, 1);
    } catch (e) {
      console.error(e);
      alert("Ошибка при добавлении в корзину");
    } finally {
      setAdding(false);
    }
  };

  // Получить правильный URL изображения
  const getImageUrl = (): string | null => {
    if (!product.image_url) return null;

    // Если уже абсолютный URL, используем как есть
    if (product.image_url.startsWith("http")) {
      return product.image_url;
    }

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").trim();
    const backendHost = apiBase
      ? apiBase.replace(/\/api\/?$/, "")
      : typeof window !== "undefined"
        ? window.location.origin
        : "";
    return `${backendHost}${product.image_url}`;
  };

  const imageUrl = getImageUrl();

  // Получить высоту товара — возвращает форматированную строку либо null
  const getHeight = (): string | null => {
    const raw =
      product.height !== null &&
      product.height !== undefined &&
      String(product.height).trim() !== ""
        ? product.height
        : product.stem_length || null;

    if (raw === null || raw === undefined || raw === "") return null;

    const s = String(raw).trim();

    // Если уже содержит 'cm' или 'см', нормализуем к 'см'
    if (/cm$/i.test(s)) {
      return s.replace(/cm$/i, "см");
    }
    if (/см$/i.test(s)) {
      return s;
    }

    // Если это число (целое или с плавающей точкой) — добавляем единицу
    if (/^\d+(?:[\.,]\d+)?$/.test(s)) {
      return `${s.replace(",", ".")} см`;
    }

    // Остальные случаи — выводим как есть
    return s;
  };

  // Получить информацию об упаковке
  const getPackaging = (): string => {
    if (product.packaging_type) {
      return product.packaging_type;
    }
    if (product.quantity && product.quantity > 0) {
      return `${product.quantity} шт`;
    }
    return "1 шт";
  };

  return (
    <div className="w-full bg-white rounded-xl p-2 sm:p-3 shadow-sm hover:shadow-md transition-shadow flex gap-2 sm:gap-3">
      {/* Image section - fixed width */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-32 md:h-32 flex-shrink-0 relative rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
        {imageUrl && !imageError ? (
          <>
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              style={{ objectFit: "cover" }}
              onError={() => {
                console.warn(
                  `Image failed to load for product ${product.id}:`,
                  imageUrl,
                );
                setImageError(true);
              }}
              onLoad={() => {
                console.log(`Image loaded for product ${product.id}`);
                setImageLoaded(true);
              }}
              unoptimized
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-100 animate-pulse" />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 gap-1">
            <ImageOff className="w-6 h-6" />
            <div className="text-xs">Нет фото</div>
          </div>
        )}
      </div>

      {/* Info section - flex 1 */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-semibold text-sm sm:text-base text-gray-800 line-clamp-2">
            {product.name}
          </h4>
          {getHeight() && (
            <div className="text-xs text-gray-500 mt-1">
              Высота: {getHeight()}
            </div>
          )}
          <div className="text-xs text-gray-500">
            Упаковка: {getPackaging()}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div>
            <div className="text-sm font-bold text-gray-900">
              {product.price_per_box
                ? `${product.price_per_box} ₸/ящ`
                : `${product.price_per_unit || "-"} ₸/шт`}
            </div>
            <div className="text-xs text-gray-500">
              В наличии: {product.stock_quantity}
            </div>
          </div>
          <button
            onClick={onAdd}
            disabled={adding}
            className="ml-2 bg-[#2f6f4a] hover:bg-[#1f4a33] disabled:bg-gray-300 text-white px-3 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
