"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function SiteSearch({
  locale,
  placeholder,
  variant = "dark",
}: {
  locale: Locale;
  placeholder: string;
  variant?: "dark" | "light";
}) {
  const [q, setQ] = useState("");
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    const base = `/${locale}/documents/`;
    router.push(t ? `${base}?q=${encodeURIComponent(t)}` : base);
  };

  const isDark = variant === "dark";

  return (
    <form
      onSubmit={onSubmit}
      className={`flex w-full max-w-md items-center gap-0 overflow-hidden rounded-lg border shadow-inner ${
        isDark
          ? "border-white/15 bg-white/[0.07] focus-within:border-rka-gold/50 focus-within:ring-1 focus-within:ring-rka-gold/30"
          : "border-neutral-200 bg-white focus-within:border-rka-accent-bright focus-within:ring-1 focus-within:ring-rka-accent-bright/25"
      }`}
      role="search"
    >
      <label htmlFor="site-search-q" className="sr-only">
        {placeholder}
      </label>
      <input
        id="site-search-q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-neutral-400 ${
          isDark ? "text-white" : "text-rka-navy"
        }`}
      />
      <button
        type="submit"
        className={`flex h-9 w-10 shrink-0 items-center justify-center transition-colors ${
          isDark
            ? "bg-rka-gold/90 text-rka-navy hover:bg-rka-gold"
            : "bg-rka-accent text-white hover:bg-rka-accent-bright"
        }`}
        aria-label={placeholder}
      >
        <Search className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </form>
  );
}
