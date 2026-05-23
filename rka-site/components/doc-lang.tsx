"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { defaultLocale, isLocale } from "@/lib/i18n";

/** Sets <html lang> from URL (static export has no server proxy for x-locale). */
export function DocLang() {
  const pathname = usePathname();
  useEffect(() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    document.documentElement.lang = isLocale(seg) ? seg : defaultLocale;
  }, [pathname]);
  return null;
}
