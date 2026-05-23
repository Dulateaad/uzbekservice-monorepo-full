"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import {
  DEFAULT_PREORDER_BANNER,
  type PreorderBannerSettings,
} from "@/lib/gf-firestore/preorder-banner-settings";

export function StoreBanner() {
  const [cfg, setCfg] = useState<PreorderBannerSettings>(DEFAULT_PREORDER_BANNER);

  const load = useCallback(async () => {
    try {
      const res = await api.getPreorderBannerSettings();
      if (res?.success && res.data) setCfg(res.data);
    } catch {
      setCfg(DEFAULT_PREORDER_BANNER);
    }
  }, []);

  useEffect(() => {
    void load();
    const onUpd = () => void load();
    window.addEventListener("preorderBannerSettingsUpdated", onUpd);
    return () =>
      window.removeEventListener("preorderBannerSettingsUpdated", onUpd);
  }, [load]);

  if (!cfg.visible) return null;

  const waDigits = cfg.whatsapp_digits.replace(/\D/g, "");
  const waUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(
    "Здравствуйте! Хочу оформить предзаказ со склада.",
  )}`;
  const showDiscount = cfg.discount_percent > 0;

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-lg animate-fade-in -mt-4 relative z-10 bg-gradient-to-r from-green-50 via-white to-green-50 border border-green-200">
      <div className="absolute top-0 right-0 w-48 h-48 bg-green-100/30 rounded-full -translate-y-24 translate-x-24"></div>

      <div className="p-5 sm:p-6 relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg md:text-2xl font-extrabold text-[#2a6a3a]">
                Предзаказ
              </h3>
              {showDiscount && (
                <span className="inline-block px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  -{cfg.discount_percent}%
                </span>
              )}
            </div>
            <p className="text-gray-700 text-xs md:text-sm mt-1">
              Свежие композиции прямо от склада — гарантирована доставка
            </p>
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                <svg
                  className="w-4 h-4 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                Успейте до {cfg.deadline_text}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group px-5 py-2.5 bg-gradient-to-r from-[#568a56] to-[#3f7f46] text-white rounded-lg shadow-md hover:shadow-lg hover:from-[#4a7d4a] hover:to-[#2f6f3a] transition-all duration-200 font-semibold text-xs md:text-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
              </svg>
              Заказать
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
