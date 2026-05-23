"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { getUi } from "@/lib/i18n";
import {
  formatDate,
  newsCategories,
  newsItems,
  type NewsCategory,
} from "@/lib/content";

const PAGE_SIZE = 4;

function parseCategory(v: string | null): NewsCategory | null {
  if (!v) return null;
  if (v === "events" || v === "appointments" || v === "practice") return v;
  return null;
}

export function NewsListClient({ locale }: { locale: Locale }) {
  const ui = getUi(locale);
  const searchParams = useSearchParams();
  const cat = parseCategory(searchParams.get("cat"));
  const pageNum = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10) || 1,
  );
  const prefix = `/${locale}/news`;

  const { slice, page, totalPages } = useMemo(() => {
    const filtered = cat
      ? newsItems.filter((n) => n.category === cat)
      : [...newsItems];
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(pageNum, totalPages);
    const slice = filtered.slice(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE,
    );
    return { slice, page, totalPages };
  }, [cat, pageNum]);

  const catLink = (c: NewsCategory | null) => {
    const q = new URLSearchParams();
    if (c) q.set("cat", c);
    const s = q.toString();
    return s ? `${prefix}/?${s}` : `${prefix}/`;
  };

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (cat) q.set("cat", cat);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${prefix}/?${s}` : `${prefix}/`;
  };

  return (
    <main className="min-h-[50vh] bg-rka-paper pb-16 pt-8 sm:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-rka-navy sm:text-4xl">
          {ui.navNews}
        </h1>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-neutral-500">
            {ui.filterCategory}:
          </span>
          <Link
            href={`${prefix}/`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${
              !cat
                ? "bg-rka-navy text-white shadow-sm"
                : "border border-neutral-200 bg-white text-rka-navy hover:border-rka-gold/50"
            }`}
          >
            {ui.allCategories}
          </Link>
          {(Object.keys(newsCategories) as NewsCategory[]).map((c) => (
            <Link
              key={c}
              href={catLink(c)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${
                cat === c
                  ? "bg-rka-navy text-white shadow-sm"
                  : "border border-neutral-200 bg-white text-rka-navy hover:border-rka-gold/50"
              }`}
            >
              {newsCategories[c][locale]}
            </Link>
          ))}
        </div>

        <ul className="mt-10 grid gap-7 sm:grid-cols-2">
          {slice.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/${locale}/news/${item.slug}/`}
                className="group card-media flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-md shadow-neutral-900/5"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <time
                    dateTime={item.date}
                    className="text-[11px] font-bold uppercase tracking-wide text-neutral-400"
                  >
                    {formatDate(item.date, locale)}
                  </time>
                  <span className="mb-1 mt-2 text-xs font-bold uppercase tracking-wide text-rka-accent">
                    {newsCategories[item.category][locale]}
                  </span>
                  <h2 className="news-card-title font-display text-lg font-bold leading-snug text-rka-navy">
                    {item.title[locale]}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-600">
                    {item.excerpt[locale]}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {totalPages > 1 ? (
          <nav
            className="mt-12 flex items-center justify-center gap-4"
            aria-label="Pagination"
          >
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="rounded-xl border border-neutral-300 bg-white px-5 py-2 text-sm font-bold text-rka-navy shadow-sm hover:border-rka-navy"
              >
                {ui.paginationPrev}
              </Link>
            ) : (
              <span className="rounded-xl border border-transparent px-5 py-2 text-sm text-neutral-400">
                {ui.paginationPrev}
              </span>
            )}
            <span className="text-sm font-semibold text-neutral-600">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="rounded-xl border border-neutral-300 bg-white px-5 py-2 text-sm font-bold text-rka-navy shadow-sm hover:border-rka-navy"
              >
                {ui.paginationNext}
              </Link>
            ) : (
              <span className="rounded-xl border border-transparent px-5 py-2 text-sm text-neutral-400">
                {ui.paginationNext}
              </span>
            )}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
