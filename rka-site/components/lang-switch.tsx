"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";

const labels: Record<Locale, string> = {
  kk: "Қаз",
  ru: "Рус",
  en: "Eng",
};

export function LangSwitch({
  locale,
  variant = "onLight",
}: {
  locale: Locale;
  variant?: "onDark" | "onLight";
}) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const tail = segments.slice(1).join("/");

  const dark = variant === "onDark";

  return (
    <div
      className={`flex items-center gap-0.5 rounded-md p-0.5 text-xs font-semibold ${
        dark
          ? "border border-white/20 bg-black/20"
          : "border border-neutral-200 bg-neutral-100"
      }`}
      role="navigation"
      aria-label="Language"
    >
      {locales.map((l) => {
        const lHref = tail ? `/${l}/${tail}/` : `/${l}/`;
        const active = l === locale;
        return (
          <Link
            key={l}
            href={lHref}
            className={`rounded px-2 py-1 transition-colors ${
              active
                ? dark
                  ? "bg-rka-gold text-rka-navy shadow-sm"
                  : "bg-rka-navy text-white shadow-sm"
                : dark
                  ? "text-white/85 hover:bg-white/10 hover:text-white"
                  : "text-neutral-600 hover:bg-neutral-200 hover:text-rka-navy"
            }`}
            hrefLang={l}
            lang={l}
          >
            {labels[l]}
          </Link>
        );
      })}
    </div>
  );
}
