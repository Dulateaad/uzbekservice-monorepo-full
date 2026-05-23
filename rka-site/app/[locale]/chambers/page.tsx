import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { getUi, isLocale } from "@/lib/i18n";
import { chamberRegions } from "@/lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const ui = getUi(raw as Locale);
  return { title: ui.navChambers, description: ui.metaHomeDesc };
}

export default async function ChambersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const ui = getUi(locale);
  const prefix = `/${locale}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-rka-navy sm:text-3xl">
        {ui.navChambers}
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-neutral-600">
        {locale === "ru"
          ? "Контакты территориальных коллегий (демо-разметка; данные подставляются из CMS)."
          : locale === "kk"
            ? "Аймақтық алқалардың контактілері (демо; деректер CMS арқылы)."
            : "Regional bar contacts (demo layout; data from CMS later)."}
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chamberRegions.map((r) => (
          <li key={r.id} id={r.id}>
            <Link
              href={`${prefix}/chambers/#${r.id}`}
              className="block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm hover:border-rka-accent"
            >
              <span className="font-medium text-rka-navy">{r.name[locale]}</span>
              <span className="mt-2 block text-xs text-neutral-500">
                +7 (700) 000-00-00 · chamber@example.kz
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
