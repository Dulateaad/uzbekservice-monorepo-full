"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  title: string;
}

export function DashboardLayout({
  children,
  requiredRole,
  title,
}: DashboardLayoutProps) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth");
        return;
      }

      // Normalize legacy role names: some places use `employee` while
      // others expect `worker`. Treat `employee` as `worker` here so
      // requiredRole checks remain compatible.
      const normalizedRole =
        user && user.role === "employee" ? "worker" : user?.role;

      if (requiredRole && user) {
        const roles = Array.isArray(requiredRole)
          ? requiredRole
          : [requiredRole];
        if (!roles.includes(normalizedRole as any)) {
          router.push("/dashboard");
        }
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-[#568a56] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) return null;

  const role = user.role === "employee" ? "worker" : user.role;

  const getNavItems = () => {
    const items: { href: string; label: string; icon: string }[] = [];

    if (role === "admin") {
      items.push(
        { href: "/admin", label: "Обзор", icon: "home" },
        { href: "/admin/settings", label: "Настройки", icon: "cog" },
        { href: "/admin/users", label: "Пользователи", icon: "users" },
        { href: "/admin/employees", label: "Сотрудники", icon: "briefcase" },
        { href: "/admin/flowers", label: "Цветы", icon: "flower" },
        { href: "/admin/products", label: "Товары", icon: "tag" },
        { href: "/admin/orders", label: "Заказы", icon: "shopping-cart" },
        { href: "/admin/inventory", label: "Поставки", icon: "package" },
        { href: "/admin/shifts", label: "Смены", icon: "clock" },
        { href: "/admin/calendar", label: "Календарь", icon: "calendar" },
      );
    } else if (role === "worker") {
      items.push(
        { href: "/employee", label: "Обзор", icon: "home" },
        { href: "/employee/users", label: "Пользователи", icon: "users" },
        { href: "/employee/flowers", label: "Цветы", icon: "flower" },
        { href: "/employee/products", label: "Товары", icon: "tag" },
        { href: "/employee/orders", label: "Заказы", icon: "shopping-cart" },
        { href: "/employee/inventory", label: "Поставки", icon: "package" },
        { href: "/employee/shifts", label: "Смены", icon: "clock" },
        { href: "/employee/calendar", label: "Календарь", icon: "calendar" },
      );
    } else {
      items.push(
        { href: "/client", label: "Обзор", icon: "home" },
        { href: "/catalog", label: "Цветы", icon: "flower" },
        { href: "/client/orders", label: "Заказы", icon: "shopping-cart" },
        { href: "/client/profile", label: "Профиль", icon: "user" },
      );
    }

    return items;
  };

  const navItems = getNavItems();

  const getIcon = (icon: string) => {
    switch (icon) {
      case "home":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        );
      case "users":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1"
            />
          </svg>
        );
      case "briefcase":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
      case "package":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        );
      case "shopping-cart":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case "clock":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "plus":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        );
      case "flower":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        );
      case "tag":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        );
      case "user":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        );
      case "calendar":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case "cog":
      case "settings":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l.286.879a1 1 0 00.95.69h.995c.969 0 1.371 1.24.588 1.81l-.804.588a1 1 0 00-.364 1.118l.286.879c.3.921-.755 1.688-1.538 1.118l-.804-.588a1 1 0 00-1.176 0l-.804.588c-.783.57-1.838-.197-1.538-1.118l.286-.879a1 1 0 00-.364-1.118l-.804-.588c-.783-.57-.381-1.81.588-1.81h.995a1 1 0 00.95-.69l.286-.879z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getRoleBadge = () => {
    const r = role;
    switch (r) {
      case "admin":
        return (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
            Админ
          </span>
        );
      case "worker":
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
            Работник
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
            Клиент
          </span>
        );
    }
  };
  const hideSidebarFor = (p: string) => pathname && pathname.startsWith(p);

  // Hide the sidebar for specific routes where we show a bottom nav instead.
  const showSidebar = !(
    hideSidebarFor("/admin/users") ||
    hideSidebarFor("/employee/users") ||
    hideSidebarFor("/admin/orders") ||
    hideSidebarFor("/employee/orders") ||
    hideSidebarFor("/admin/shifts") ||
    hideSidebarFor("/employee/shifts") ||
    hideSidebarFor("/admin/settings") ||
    hideSidebarFor("/admin/inventory") ||
    hideSidebarFor("/employee/inventory")
  );

  const isStaffPanel = role === "admin" || role === "worker";

  // Admin bottom nav ordering to mirror the hard‑coded /admin/orders bar
  // (orders on left, settings on right). Keeps consistency across pages.
  const adminBottomOrder = [
    "/admin/orders",
    "/admin/shifts",
    "/admin/users",
    "/admin/inventory",
    "/admin/settings",
  ];

  // Employee bottom nav ordering (mirrors admin order but with employee routes)
  const employeeBottomOrder = [
    // employees don't currently have a settings page, omit or add if needed
    "/employee/orders",
    "/employee/shifts",
    "/employee/users",
    "/employee/inventory",
  ];

  const bottomOrder =
    role === "admin"
      ? adminBottomOrder
      : role === "worker"
        ? employeeBottomOrder
        : [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile slide-over (admin / worker) */}
      {isStaffPanel && mobileNavOpen && (
        <div
          className="fixed inset-0 z-[2000] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Меню панели"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Закрыть меню"
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(20rem,92vw)] bg-white border-r border-gray-200 shadow-xl flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-2">
              <span className="font-semibold text-[#568a56]">Меню</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            <div className="p-4 border-b border-gray-200">
              <p className="font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
              <div className="mt-2">{getRoleBadge()}</div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-green-50 hover:text-[#568a56] rounded-lg transition-colors"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {getIcon(item.icon)}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-200 space-y-1">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 text-gray-800 hover:bg-green-50 rounded-lg font-medium"
                onClick={() => setMobileNavOpen(false)}
              >
                <span className="text-lg" aria-hidden>
                  ⌂
                </span>
                <span>В главное меню</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  void logout();
                }}
                className="flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg w-full text-left"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Выйти</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar desktop */}
      {showSidebar && (
        <aside className="w-64 shrink-0 bg-white border-r border-gray-200 hidden lg:flex flex-col">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <span className="font-semibold text-[#568a56] text-lg">
                Spray Flowers
              </span>
              <p className="text-xs text-gray-500 mt-1">Панель управления</p>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-gray-200">
              <p className="font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
              <div className="mt-2">{getRoleBadge()}</div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-green-50 hover:text-[#568a56] rounded-lg transition-colors"
                >
                  {getIcon(item.icon)}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 space-y-1">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 text-gray-800 hover:bg-green-50 rounded-lg transition-colors font-medium"
              >
                <span className="text-lg" aria-hidden>
                  ⌂
                </span>
                <span>В главное меню</span>
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full text-left"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Выйти</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 ${!showSidebar ? "pb-20" : ""}`}
      >
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center gap-2 sm:gap-4 justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isStaffPanel && (
              <button
                type="button"
                className="lg:hidden p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 shrink-0"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Открыть меню"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}
            <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end shrink-0">
            {isStaffPanel && (
              <Link
                href="/"
                className="text-sm font-medium text-[#568a56] hover:underline whitespace-nowrap"
              >
                В главное меню
              </Link>
            )}
            <span className="text-sm text-gray-500 hidden sm:inline max-w-[12rem] truncate">
              {user.email}
            </span>
            {getRoleBadge()}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-6 overflow-x-auto w-full min-w-0">
          {children}
        </main>
      </div>

      {/* Bottom admin nav when sidebar hidden (e.g., clients page) */}
      {!showSidebar && (
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            height: 70,
            zIndex: 1000,
            backgroundColor: "white",
            boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.06)",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
          }}
          className="border-t border-gray-200"
        >
          <div className="flex justify-around items-center gap-4 w-full h-full">
            {bottomOrder.map((href) => {
              const item = navItems.find((n) => n.href === href) || {
                href,
                label: href.replace(`/${role}/`, ""),
                icon: "home",
              };
              const isActive =
                pathname === item.href ||
                (item.href.endsWith("/orders") &&
                  pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center transition-all duration-200 py-3 flex-1 ${isActive ? "text-[#2f6f4a]" : "text-gray-600 hover:text-[#2f6f4a]"}`}
                >
                  <div className="w-6 h-6 flex items-center justify-center mb-1">
                    {getIcon(item.icon)}
                  </div>
                  <span className="text-xs font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
