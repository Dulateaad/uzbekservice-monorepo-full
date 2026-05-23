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
  return { title: ui.navAbout, description: ui.metaHomeDesc };
}

const copy: Record<
  Locale,
  { p1: string; p2: string }
> = {
  ru: {
    p1: "Республиканская коллегия адвокатов — публично-правовой институт, объединяющий адвокатов и обеспечивающий развитие адвокатуры.",
    p2: "Здесь будет структура органов, история и контакты (наполнение через административную панель).",
  },
  kk: {
    p1: "Қазақстан Республикасының адвокаттар алқасы — адвокаттарды біріктіретін және адвокатураны дамытуды қамтамасыз ететін құқықтық институт.",
    p2: "Мұнда органдар құрылымы, тарих және байланыстар болады (әкімшілік панель арқылы).",
  },
  en: {
    p1: "The Republican Bar Association is a public-law institution that unites advocates and supports the development of the legal profession.",
    p2: "Structure, history, and contacts will be managed in the CMS.",
  },
};

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const ui = getUi(locale);
  const t = copy[locale];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-rka-navy sm:text-3xl">
        {ui.navAbout}
      </h1>
      <div className="mt-8 space-y-4 text-neutral-700 leading-relaxed">
        <p>{t.p1}</p>
        <p>{t.p2}</p>
      </div>
    </main>
  );
}
