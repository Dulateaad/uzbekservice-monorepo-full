import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { getUi, isLocale } from "@/lib/i18n";
import { formatDate, statements } from "@/lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const ui = getUi(raw as Locale);
  return {
    title: ui.statementsSection,
    description: ui.metaHomeDesc,
  };
}

export default async function StatementsPage({
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
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-rka-navy sm:text-3xl">
        {ui.statementsSection}
      </h1>
      <ul className="mt-8 space-y-6">
        {statements.map((s) => (
          <li key={s.slug} id={s.slug}>
            <article className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
              <time
                dateTime={s.date}
                className="text-sm text-neutral-500"
              >
                {formatDate(s.date, locale)}
              </time>
              <h2 className="mt-2 text-lg font-semibold text-rka-navy">
                {s.title[locale]}
              </h2>
              <p className="mt-3 text-sm text-neutral-600">
                {locale === "ru"
                  ? "Полный текст публикуется после подключения CMS."
                  : locale === "kk"
                    ? "CMS қосылғаннан кейін толық мәтін жарияланады."
                    : "Full text will be available once the CMS is connected."}
              </p>
              <Link
                href={`${prefix}/documents/`}
                className="mt-4 inline-block text-sm font-semibold text-rka-accent hover:underline"
              >
                {ui.allDocuments} →
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </main>
  );
}
