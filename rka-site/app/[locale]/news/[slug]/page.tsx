import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { getUi, isLocale, locales } from "@/lib/i18n";
import {
  formatDate,
  getNewsBySlug,
  getRelatedNews,
  newsCategories,
  newsItems,
} from "@/lib/content";
import { Breadcrumb } from "@/components/breadcrumb";

export function generateStaticParams() {
  return newsItems.flatMap((n) =>
    locales.map((locale) => ({
      locale,
      slug: n.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const item = getNewsBySlug(slug);
  if (!item) return {};
  return {
    title: item.title[locale],
    description: item.excerpt[locale],
    openGraph: {
      title: item.title[locale],
      description: item.excerpt[locale],
      type: "article",
      publishedTime: item.date,
    },
  };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const ui = getUi(locale);
  const item = getNewsBySlug(slug);
  if (!item) notFound();

  const related = getRelatedNews(slug, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title[locale],
    datePublished: item.date,
    image: [item.image],
    description: item.excerpt[locale],
    author: { "@type": "Organization", name: ui.siteNameLong },
    publisher: {
      "@type": "Organization",
      name: ui.siteNameLong,
    },
  };

  const crumbs = [
    { label: ui.breadcrumbHome, href: `/${locale}/` },
    { label: ui.navNews, href: `/${locale}/news/` },
    { label: item.title[locale] },
  ];

  return (
    <main className="min-h-[60vh] bg-rka-paper pb-16 pt-6 sm:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-4xl">
        <Breadcrumb items={crumbs} />

        {item.tags?.length ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {item.tags.map((tag, i) => (
              <li key={i}>
                <span className="inline-flex rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-600 shadow-sm">
                  {tag[locale]}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-4 text-sm font-bold uppercase tracking-wide text-rka-accent">
          {newsCategories[item.category][locale]}
        </p>

        <h1 className="font-display mt-3 text-3xl font-bold leading-[1.15] tracking-tight text-rka-navy sm:text-4xl lg:text-[2.5rem]">
          {item.title[locale]}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
          <time dateTime={item.date} className="font-medium text-neutral-600">
            {formatDate(item.date, locale)}
          </time>
          <span className="hidden text-neutral-300 sm:inline" aria-hidden>
            ·
          </span>
          <span className="text-neutral-500">{ui.siteNameLong}</span>
        </div>

        <figure className="mt-8 overflow-hidden rounded-2xl border border-neutral-200/90 bg-neutral-100 shadow-lg shadow-neutral-900/10 ring-1 ring-black/[0.04]">
          <div className="relative aspect-[16/9] max-h-[460px] w-full">
            <Image
              src={item.image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
              priority
            />
          </div>
          {item.imageCredit ? (
            <figcaption className="border-t border-neutral-200/80 bg-white px-4 py-2.5 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-600">
                {ui.photoCredit}
              </span>{" "}
              {item.imageCredit[locale]}
            </figcaption>
          ) : null}
        </figure>

        <div className="article-prose mt-10 max-w-none border-b border-neutral-200/80 pb-10">
          <p>{item.body[locale]}</p>
        </div>

        {item.attachments?.length ? (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-rka-accent">
              PDF
            </h2>
            <ul className="mt-3 space-y-2">
              {item.attachments.map((a, i) => (
                <li key={i}>
                  <a
                    href={a.href}
                    className="font-semibold text-rka-accent-bright hover:text-rka-accent hover:underline"
                  >
                    {a.label[locale]}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-10">
          <Link
            href={`/${locale}/news/`}
            className="inline-flex items-center gap-2 text-sm font-bold text-rka-accent-bright hover:text-rka-accent hover:underline"
          >
            ← {ui.navNews}
          </Link>
        </div>
      </article>

      {related.length ? (
        <section
          className="mx-auto mt-16 max-w-7xl border-t border-neutral-200/80 px-4 pt-12 sm:px-6"
          aria-label={ui.readAlso}
        >
          <h2 className="font-display text-xl font-bold text-rka-navy sm:text-2xl">
            {ui.readAlso}
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/${locale}/news/${r.slug}/`}
                  className="group card-media flex gap-4 rounded-2xl border border-neutral-200/90 bg-white p-3 shadow-md shadow-neutral-900/5"
                >
                  <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={r.image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="128px"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <time
                      dateTime={r.date}
                      className="text-[10px] font-bold uppercase tracking-wide text-neutral-400"
                    >
                      {formatDate(r.date, locale)}
                    </time>
                    <span className="news-card-title font-display mt-1 text-sm font-bold leading-snug text-rka-navy">
                      {r.title[locale]}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
