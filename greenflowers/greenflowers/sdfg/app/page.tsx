"use client";

import React from "react";
import { Header } from "@/components/header";
import { StoreBanner } from "@/components/store/banner";
import { StoreFilters } from "@/components/store/filters";
import { ProductsSection } from "@/components/store/products-section";
import { CartProvider } from "@/contexts/cart-context";
import { useLanguageContext } from "@/contexts/language-context";

export default function Home() {
  const { isClient } = useLanguageContext();

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StoreBanner />

        <div className="mt-8 grid grid-cols-[120px_minmax(0,1fr)] md:grid-cols-[180px_minmax(0,1fr)] gap-4">
          <aside className="min-w-[120px] md:min-w-[180px]">
            <StoreFilters />
          </aside>

          <section className="min-w-0">
            <ProductsSection />
          </section>
        </div>
      </main>
    </div>
  );
}
