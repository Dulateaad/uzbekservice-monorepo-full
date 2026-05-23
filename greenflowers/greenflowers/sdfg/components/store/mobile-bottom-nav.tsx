"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { getCartCount } = useCart();

  // Не показывать на админ и на страницах сотрудника
  if (pathname.startsWith("/admin") || pathname.startsWith("/employee"))
    return null;

  const items = [
    {
      href: "/",
      label: "Главная",
      icon: (
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z"
            strokeWidth={1.5}
          />
        </svg>
      ),
    },
    {
      href:
        isAuthenticated && user?.role === "user"
          ? "/client/orders"
          : "/orders",
      label: "Заказы",
      icon: (
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M3 7h18M3 12h18M3 17h18" strokeWidth={1.5} />
        </svg>
      ),
    },
    {
      href: "/cart",
      label: "Корзина",
      icon: (
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" strokeWidth={1.5} />
        </svg>
      ),
    },
    {
      href: isAuthenticated ? "/profile" : "/auth",
      label: isAuthenticated ? "Профиль" : "Войти",
      icon: (
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM4 21a8 8 0 0 1 16 0"
            strokeWidth={1.5}
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          height: "70px",
          zIndex: 1000,
          backgroundColor: "white",
          boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
        }}
        className="md:hidden border-t border-gray-200"
      >
        <div className="flex justify-around items-center gap-4 w-full h-full">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.label === "Заказы" &&
                (pathname.startsWith("/orders") ||
                  pathname.startsWith("/client/orders")));

            // Отдельная обработка для корзины чтобы добавить бейдж
            if (item.href === "/cart") {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center transition-all duration-200 py-3 flex-1 relative ${
                    isActive
                      ? "text-[#2f6f4a]"
                      : "text-gray-600 hover:text-[#2f6f4a]"
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center mb-1 relative">
                    {item.icon}
                    {getCartCount() > 0 && (
                      <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                        {getCartCount()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold">{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center transition-all duration-200 py-3 flex-1 ${
                  isActive
                    ? "text-[#2f6f4a]"
                    : "text-gray-600 hover:text-[#2f6f4a]"
                }`}
              >
                <div className="w-6 h-6 flex items-center justify-center mb-1">
                  {item.icon}
                </div>
                <span className="text-xs font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
