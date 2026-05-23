import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { getUi, isLocale } from "@/lib/i18n";
import { HomePage } from "@/components/home-page";
import { siteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const ui = getUi(locale);
  const base = siteUrl.replace(/\/$/, "");
  return {
    title: ui.metaHomeTitle,
    description: ui.metaHomeDesc,
    alternates: {
      canonical: `${base}/${locale}/`,
      languages: {
        kk: `${base}/kk/`,
        ru: `${base}/ru/`,
        en: `${base}/en/`,
      },
    },
    openGraph: {
      title: ui.metaHomeTitle,
      description: ui.metaHomeDesc,
      locale: locale === "kk" ? "kk_KZ" : locale === "en" ? "en_US" : "ru_RU",
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  return <HomePage locale={raw as Locale} />;
}
