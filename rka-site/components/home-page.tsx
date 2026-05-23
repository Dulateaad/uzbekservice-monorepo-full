import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { getUi } from "@/lib/i18n";
import {
  activities,
  chamberRegions,
  documents,
  formatDate,
  newsItems,
  statements,
} from "@/lib/content";
import { OrganizationJsonLd } from "./json-ld";
import { SectionHeading } from "./section-heading";

export function HomePage({ locale }: { locale: Locale }) {
  const ui = getUi(locale);
  const prefix = `/${locale}`;
  const [lead, ...rest] = newsItems;
  const sidebar = rest.slice(0, 5);
  const gridFour = newsItems.slice(1, 5);
  const docColumns = [documents.slice(0, 3), documents.slice(3, 6)];

  return (
    <>
      <OrganizationJsonLd locale={locale} />
      <main>
        <section
          className="relative border-b border-neutral-200/80 bg-gradient-to-b from-white via-rka-paper to-rka-muted/80 bg-grid-faint"
          aria-labelledby="lead-heading"
        >
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
              <article className="lg:col-span-7">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rka-gold shadow-sm shadow-rka-gold/40" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-rka-accent">
                    {ui.mainNews}
                  </p>
                </div>
                <Link
                  href={`${prefix}/news/${lead.slug}/`}
                  className="card-media group block overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-lg shadow-neutral-900/5 ring-1 ring-black/[0.03]"
                >
                  <div className="relative aspect-[16/10] max-h-[340px] w-full sm:max-h-[380px]">
                    <Image
                      src={lead.image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 1024px) 100vw, 58vw"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-rka-navy via-rka-navy/55 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                      <time
                        dateTime={lead.date}
                        className="text-xs font-medium text-white/75"
                      >
                        {formatDate(lead.date, locale)}
                      </time>
                      <h2
                        id="lead-heading"
                        className="font-display mt-2 text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl"
                      >
                        {lead.title[locale]}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/88">
                        {lead.excerpt[locale]}
                      </p>
                    </div>
                  </div>
                </Link>
              </article>

              <aside
                className="rounded-2xl border border-neutral-200/80 bg-white/90 p-1 shadow-md shadow-neutral-900/5 lg:col-span-5"
                aria-label={ui.newsSection}
              >
                <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 pb-3 pt-3">
                  <h2 className="font-display text-lg font-bold text-rka-navy">
                    {ui.newsSection}
                  </h2>
                  <Link
                    href={`${prefix}/news/`}
                    className="shrink-0 rounded-lg bg-rka-navy px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-rka-navy-soft hover:shadow-md"
                  >
                    {ui.allNews}
                  </Link>
                </div>
                <ul className="divide-y divide-neutral-100 px-2">
                  {sidebar.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`${prefix}/news/${item.slug}/`}
                        className="flex gap-3 rounded-lg py-3 pl-2 pr-2 transition-colors hover:bg-rka-muted/60"
                      >
                        <time
                          dateTime={item.date}
                          className="w-[5.5rem] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-neutral-400"
                        >
                          {formatDate(item.date, locale)}
                        </time>
                        <span className="news-card-title text-sm font-semibold leading-snug text-rka-navy">
                          {item.title[locale]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="p-3 lg:hidden">
                  <Link
                    href={`${prefix}/news/`}
                    className="flex w-full items-center justify-center rounded-xl border border-rka-navy/20 bg-rka-muted/50 py-2.5 text-sm font-bold text-rka-navy hover:bg-rka-muted"
                  >
                    {ui.allNews}
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section
          className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14"
          aria-labelledby="news-grid-title"
        >
          <SectionHeading
            id="news-grid-title"
            title={ui.newsSection}
            action={
              <Link
                href={`${prefix}/news/`}
                className="rounded-lg bg-rka-navy px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-rka-navy-soft hover:shadow-md"
              >
                {ui.allNews}
              </Link>
            }
          />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {gridFour.map((item) => (
              <li key={item.slug} className="h-full">
                <Link
                  href={`${prefix}/news/${item.slug}/`}
                  className="group card-media flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-md shadow-neutral-900/5"
                >
                  <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 100vw, 25vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <time
                      dateTime={item.date}
                      className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400"
                    >
                      {formatDate(item.date, locale)}
                    </time>
                    <h3 className="news-card-title font-display mt-2 flex-1 text-base font-bold leading-snug text-rka-navy">
                      {item.title[locale]}
                    </h3>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="border-y border-neutral-200/80 bg-gradient-to-b from-rka-muted/50 to-white py-12 sm:py-14"
          aria-labelledby="statements-title"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading id="statements-title" title={ui.statementsSection} />
            <ul className="grid gap-5 md:grid-cols-3">
              {statements.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`${prefix}/statements/#${s.slug}`}
                    className="card-media block h-full rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-md shadow-neutral-900/5"
                  >
                    <time
                      dateTime={s.date}
                      className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400"
                    >
                      {formatDate(s.date, locale)}
                    </time>
                    <h3 className="news-card-title font-display mt-3 text-base font-bold leading-snug text-rka-navy">
                      {s.title[locale]}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-8">
              <Link
                href={`${prefix}/documents/`}
                className="text-sm font-bold text-rka-accent-bright hover:text-rka-accent hover:underline"
              >
                {ui.allDocuments} →
              </Link>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
          <SectionHeading id="documents-title" title={ui.documentsSection} />
          <div className="mt-2 grid gap-10 md:grid-cols-2">
            {docColumns.map((col, ci) => (
              <ul
                key={ci}
                className="space-y-1 rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-sm"
              >
                {col.map((doc) => (
                  <li key={doc.id}>
                    <a
                      href={doc.href}
                      className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-rka-muted/70"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rka-muted text-rka-accent">
                        <FileText className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-sm font-semibold leading-snug text-rka-navy">
                        {doc.title[locale]}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href={`${prefix}/documents/`}
              className="inline-flex rounded-xl border-2 border-rka-navy bg-transparent px-5 py-2.5 text-sm font-bold text-rka-navy transition-colors hover:bg-rka-navy hover:text-white"
            >
              {ui.allDocuments}
            </Link>
          </div>
        </section>

        <section className="border-t border-neutral-200/80 bg-white py-12 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading id="activities-title" title={ui.activitiesSection} />
            <ul className="mt-2 grid gap-6 md:grid-cols-3">
              {activities.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`${prefix}/advocacy/#${a.slug}`}
                    className="card-media group relative block aspect-[4/3] overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5"
                  >
                    <Image
                      src={a.image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-rka-navy via-rka-navy/50 to-rka-navy/10" />
                    <span className="font-display absolute inset-x-0 bottom-0 p-5 text-center text-base font-bold text-white drop-shadow-md sm:text-lg">
                      {a.title[locale]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-neutral-200/80 bg-rka-muted/40 py-12 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading id="chambers-title" title={ui.chambersSection} />
            <p className="-mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
              {locale === "ru"
                ? "Выберите регион для контактов территориальной коллегии (демо)."
                : locale === "kk"
                  ? "Аймақтық алқа контактілері үшін өңірді таңдаңыз (демо)."
                  : "Select a region for regional bar contacts (demo)."}
            </p>
            <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {chamberRegions.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`${prefix}/chambers/#${r.id}`}
                    className="block rounded-xl border border-neutral-200/90 bg-white px-3 py-2.5 text-center text-xs font-semibold text-rka-navy shadow-sm transition-all hover:border-rka-gold/60 hover:shadow-md sm:text-sm"
                  >
                    {r.name[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
