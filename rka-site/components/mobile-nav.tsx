"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { getUi } from "@/lib/i18n";

const NAV = [
  { key: "about", path: "about" },
  { key: "advocacy", path: "advocacy" },
  { key: "documents", path: "documents" },
  { key: "news", path: "news" },
  { key: "lawyers", path: "for-lawyers" },
  { key: "citizens", path: "for-citizens" },
  { key: "chambers", path: "chambers" },
] as const;

function navLabel(ui: ReturnType<typeof getUi>, key: (typeof NAV)[number]["key"]) {
  switch (key) {
    case "about":
      return ui.navAbout;
    case "advocacy":
      return ui.navAdvocacy;
    case "documents":
      return ui.navDocuments;
    case "news":
      return ui.navNews;
    case "lawyers":
      return ui.navLawyers;
    case "citizens":
      return ui.navCitizens;
    case "chambers":
      return ui.navChambers;
  }
}

export function MobileNav({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const ui = getUi(locale);
  const prefix = `/${locale}`;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="rounded-md border border-white/25 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-expanded={open}
        aria-controls="mobile-drawer"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        <span className="sr-only">Menu</span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-32 z-[90] bg-rka-navy/50 backdrop-blur-md lg:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-drawer"
            className="fixed inset-x-0 top-32 z-[100] max-h-[min(85vh,560px)] overflow-y-auto border-b border-white/25 bg-white/55 shadow-xl shadow-rka-navy/15 backdrop-blur-xl supports-[backdrop-filter]:bg-white/45 lg:hidden"
            role="dialog"
          >
            <nav
              className="flex flex-col gap-2 p-3"
              aria-label="Mobile"
            >
              {NAV.map((item) => (
                <Link
                  key={item.path}
                  href={`${prefix}/${item.path}/`}
                  className="rounded-xl border border-white/50 bg-white/40 px-4 py-3.5 text-base font-semibold text-rka-navy shadow-sm backdrop-blur-sm transition-colors hover:border-white/70 hover:bg-white/60 active:bg-white/55"
                  onClick={() => setOpen(false)}
                >
                  {navLabel(ui, item.key)}
                </Link>
              ))}
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
