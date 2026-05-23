"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguageContext } from "@/contexts/language-context";
import { useCity } from "@/contexts/city-context";
import { useAuth } from "@/contexts/auth-context";
import { getTranslation } from "@/lib/i18n";

const DEFAULT_CITIES = ["Алматы", "Шымкент", "Астана"];

export function Header() {
  const { language, isClient } = useLanguageContext();
  const { user, isAuthenticated, logout } = useAuth();
  const { city, setCity } = useCity();
  const [availableCities, setAvailableCities] =
    useState<string[]>(DEFAULT_CITIES);

  useEffect(() => {
    if (!city) setCity("Алматы");
    // Load cities from localStorage
    const loadCities = () => {
      const savedCities = localStorage.getItem("availableCities");
      if (savedCities) {
        try {
          const cities = JSON.parse(savedCities);
          setAvailableCities(cities);
          // If current city is not in the list, set to first available
          if (city && !cities.includes(city)) {
            setCity(cities[0] || "Алматы");
          }
        } catch (err) {
          console.error("Error loading cities:", err);
        }
      }
    };

    loadCities();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "availableCities") {
        loadCities();
      }
    };

    // Listen for custom events from AdminSettings
    const handleCitiesUpdated = (e: CustomEvent<string[]>) => {
      setAvailableCities(e.detail);
      // If current city is not in the new list, set to first available
      if (city && !e.detail.includes(city)) {
        setCity(e.detail[0] || "Алматы");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(
      "citiesUpdated",
      handleCitiesUpdated as EventListener,
    );

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "citiesUpdated",
        handleCitiesUpdated as EventListener,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isClient) return null;

  const navLinks = [
    { href: "#catalog", label: getTranslation(language, "catalog") },
    { href: "#about", label: getTranslation(language, "about") },
    { href: "#delivery", label: getTranslation(language, "delivery") },
    { href: "#faq", label: getTranslation(language, "faq") },
    { href: "#contact", label: getTranslation(language, "contact") },
  ];

  const getDashboardLink = () => {
    if (!user) return "/auth";
    switch (user.role) {
      case "admin":
        return "/admin";
      case "worker":
        return "/employee";
      case "user":
        return "/client/profile";
      default:
        return "/dashboard";
    }
  };

  return (
    <header className="bg-gradient-to-r from-[#568a56] to-[#417d47] sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 gap-8">
          {/* Logo Section */}
          <Link
            href="/"
            className="flex items-center gap-2 min-w-fit hover:opacity-90 transition-opacity duration-200"
          >
            <span className="font-extrabold text-white text-2xl hidden sm:block tracking-tight">
              Spray Flowers
            </span>
            <span className="font-extrabold text-white text-xl sm:hidden">
              SFlowers
            </span>
          </Link>

          {/* City Selector - Mobile */}
          <div className="flex-1 sm:hidden mr-4">
            <div className="relative w-full">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
              </svg>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full appearance-none bg-white/20 border border-white/30 text-white placeholder-white/60 pl-9 pr-10 py-2.5 rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200 text-sm font-medium"
              >
                {availableCities.map((c) => (
                  <option key={c} value={c} className="text-gray-900">
                    {c}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* City Selector - Desktop */}
          <div className="hidden sm:flex flex-1 max-w-xs">
            <div className="relative w-full">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
              </svg>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full appearance-none bg-white/20 border border-white/30 text-white placeholder-white/60 pl-9 pr-10 py-2.5 rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200 text-sm font-medium"
              >
                {availableCities.map((c) => (
                  <option key={c} value={c} className="text-gray-900">
                    {c}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Auth Button */}
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link href={getDashboardLink()}>
                  <button className="px-4 py-2 bg-white text-[#568a56] rounded-lg font-semibold hover:bg-green-50 transition-all duration-200 shadow-sm hover:shadow-md">
                    {user?.name ? `${user.name}` : "Кабинет"}
                  </button>
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-white border border-white/40 rounded-lg hover:bg-white/10 font-medium transition-all duration-200"
                >
                  Выход
                </button>
              </div>
            ) : (
              <Link href="/auth" className="hidden sm:block">
                <button className="px-6 py-2.5 bg-white text-[#568a56] rounded-lg font-bold hover:bg-green-50 transition-all duration-200 shadow-md hover:shadow-lg">
                  Войти
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
      </div>
    </header>
  );
}
