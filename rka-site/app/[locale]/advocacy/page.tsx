import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { getUi, isLocale } from "@/lib/i18n";
import { activities } from "@/lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const ui = getUi(raw as Locale);
  return { title: ui.navAdvocacy, description: ui.metaHomeDesc };
}

export default async function AdvocacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const ui = getUi(locale);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-rka-navy sm:text-3xl">
        {ui.navAdvocacy}
      </h1>
      <p className="mt-4 text-neutral-700 leading-relaxed">
        {locale === "ru"
          ? "Раздел для материалов об институте адвокатуры, гарантиях и стандартах."
          : locale === "kk"
            ? "Адвокатура институты, кепілдіктер және стандарттар туралы материалдар бөлімі."
            : "Materials on the legal profession, safeguards, and standards."}
      </p>
      <ul className="mt-10 space-y-8">
        {activities.map((a) => (
          <li key={a.slug} id={a.slug}>
            <h2 className="text-lg font-semibold text-rka-navy">
              {a.title[locale]}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {locale === "ru"
                ? "Контент будет добавлен в CMS."
                : locale === "kk"
                  ? "Мазмұн CMS арқылы қосылады."
                  : "Content will be added via CMS."}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
