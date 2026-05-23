import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { getUi } from "@/lib/i18n";
import { LangSwitch } from "./lang-switch";
import { MobileNav } from "./mobile-nav";
import { SiteSearch } from "./site-search";

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

export function SiteHeader({ locale }: { locale: Locale }) {
  const ui = getUi(locale);
  const prefix = `/${locale}`;

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-white/10 bg-gradient-to-r from-rka-navy via-rka-navy-mid to-rka-navy-soft text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <Link
            href={`${prefix}/`}
            className="group flex min-w-0 shrink-0 flex-col leading-tight"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rka-gold-muted">
              {ui.siteNameLong}
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
              {ui.siteName}
            </span>
          </Link>

          <div className="mx-auto hidden min-w-0 flex-1 justify-center px-4 md:flex">
            <SiteSearch
              locale={locale}
              placeholder={ui.searchPlaceholder}
              variant="dark"
            />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <LangSwitch locale={locale} variant="onDark" />
            <MobileNav locale={locale} />
          </div>
        </div>
      </div>

      <div className="border-b border-neutral-200/90 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto hidden max-w-7xl px-4 sm:px-6 lg:block">
          <nav
            className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0 py-2.5 text-[13px] font-semibold text-neutral-700 xl:gap-x-0 xl:text-sm"
            aria-label="Primary"
          >
            {NAV.map((item) => (
              <Link
                key={item.path}
                href={`${prefix}/${item.path}/`}
                className="relative rounded-md px-3 py-2 transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-rka-gold after:transition-transform hover:bg-rka-muted/80 hover:text-rka-navy hover:after:scale-x-100 xl:px-4"
              >
                {navLabel(ui, item.key)}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-b border-neutral-200 bg-rka-paper px-4 py-2 md:hidden">
        <SiteSearch
          locale={locale}
          placeholder={ui.searchPlaceholder}
          variant="light"
        />
      </div>
    </header>
  );
}
