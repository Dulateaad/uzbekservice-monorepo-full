import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { getUi } from "@/lib/i18n";

const col1 = [
  { key: "about" as const, path: "about" },
  { key: "advocacy" as const, path: "advocacy" },
] as const;
const col2 = [
  { key: "documents" as const, path: "documents" },
  { key: "news" as const, path: "news" },
] as const;
const col3 = [
  { key: "lawyers" as const, path: "for-lawyers" },
  { key: "citizens" as const, path: "for-citizens" },
  { key: "chambers" as const, path: "chambers" },
] as const;

function label(
  ui: ReturnType<typeof getUi>,
  key:
    | (typeof col1)[number]["key"]
    | (typeof col2)[number]["key"]
    | (typeof col3)[number]["key"],
) {
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

export function SiteFooter({ locale }: { locale: Locale }) {
  const ui = getUi(locale);
  const prefix = `/${locale}`;

  const sectionTitle =
    locale === "ru"
      ? "Разделы"
      : locale === "kk"
        ? "Бөлімдер"
        : "Sections";

  return (
    <footer className="relative mt-20 border-t border-white/10 bg-gradient-to-b from-rka-navy via-rka-navy-mid to-[#060a14] text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rka-gold/70 to-transparent"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <p className="font-display text-2xl font-bold tracking-tight text-white">
              {ui.siteName}
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
              {ui.siteNameLong}
            </p>
            <p className="mt-6 text-xs uppercase tracking-wider text-rka-gold-muted">
              © {new Date().getFullYear()}
            </p>
          </div>

          <div className="grid gap-10 sm:col-span-2 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rka-gold-muted">
                {sectionTitle}
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col1.map((item) => (
                  <li key={item.path}>
                    <Link
                      href={`${prefix}/${item.path}/`}
                      className="text-white/80 transition-colors hover:text-rka-gold-muted"
                    >
                      {label(ui, item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <ul className="mt-0 space-y-2.5 text-sm sm:mt-9 lg:mt-9">
                {col2.map((item) => (
                  <li key={item.path}>
                    <Link
                      href={`${prefix}/${item.path}/`}
                      className="text-white/80 transition-colors hover:text-rka-gold-muted"
                    >
                      {label(ui, item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <ul className="mt-0 space-y-2.5 text-sm sm:col-span-2 sm:mt-0 lg:mt-9">
                {col3.map((item) => (
                  <li key={item.path}>
                    <Link
                      href={`${prefix}/${item.path}/`}
                      className="text-white/80 transition-colors hover:text-rka-gold-muted"
                    >
                      {label(ui, item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <address className="not-italic lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-wider text-rka-gold-muted">
              {locale === "ru"
                ? "Контакты"
                : locale === "kk"
                  ? "Байланыс"
                  : "Contact"}
            </p>
            <p className="mt-4 text-sm font-medium text-white">010000, Astana</p>
            <p className="mt-2 text-sm text-white/75">+7 (7172) 000-000</p>
            <p className="mt-2">
              <a
                href="mailto:info@example.kz"
                className="text-sm text-rka-gold-muted hover:text-white hover:underline"
              >
                info@example.kz
              </a>
            </p>
          </address>
        </div>
      </div>
    </footer>
  );
}
