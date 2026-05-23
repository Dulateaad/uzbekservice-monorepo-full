import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { getUi, isLocale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const ui = getUi(raw as Locale);
  return { title: ui.navCitizens, description: ui.metaHomeDesc };
}

export default async function ForCitizensPage({
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
        {ui.navCitizens}
      </h1>
      <p className="mt-4 text-neutral-700 leading-relaxed">
        {locale === "ru"
          ? "Разъяснения для граждан, как найти адвоката, типовые вопросы — раздел будет наполнен редакцией."
          : locale === "kk"
            ? "Азаматтарға түсініктемелер, адвокатты қалай табуға болады — редакция толықтырады."
            : "Guidance for citizens and how to find a lawyer — editorial content to follow."}
      </p>
    </main>
  );
}
