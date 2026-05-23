"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { getUi } from "@/lib/i18n";
import {
  documentCategories,
  documents,
  type DocumentCategory,
} from "@/lib/content";

function parseCat(v: string | null): DocumentCategory | null {
  if (!v) return null;
  const allowed: DocumentCategory[] = [
    "decisions",
    "projects",
    "discipline",
    "legislation",
  ];
  return allowed.includes(v as DocumentCategory) ? (v as DocumentCategory) : null;
}

export function DocumentsListClient({ locale }: { locale: Locale }) {
  const ui = getUi(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const cat = parseCat(searchParams.get("cat"));
  const qUrl = (searchParams.get("q") || "").trim();
  const [qInput, setQInput] = useState(qUrl);

  useEffect(() => {
    setQInput(qUrl);
  }, [qUrl]);

  const list = useMemo(() => {
    const q = qUrl.toLowerCase();
    let rows = cat ? documents.filter((d) => d.category === cat) : [...documents];
    if (q) {
      rows = rows.filter((d) => d.title[locale].toLowerCase().includes(q));
    }
    return rows;
  }, [cat, qUrl, locale]);

  const cats = Object.keys(documentCategories) as DocumentCategory[];

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (cat) p.set("cat", cat);
    if (qInput.trim()) p.set("q", qInput.trim());
    const s = p.toString();
    router.push(
      s ? `/${locale}/documents/?${s}` : `/${locale}/documents/`,
    );
  };

  return (
    <main className="min-h-[50vh] bg-rka-paper pb-16 pt-8 sm:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-rka-navy sm:text-4xl">
        {ui.navDocuments}
      </h1>

      <form
        className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end"
        onSubmit={onSubmit}
      >
        <div className="flex-1">
          <label htmlFor="doc-q" className="sr-only">
            {ui.search}
          </label>
          <input
            id="doc-q"
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={ui.search}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-rka-accent focus:ring-1 focus:ring-rka-accent"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-rka-navy px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-rka-navy-soft"
        >
          {ui.search}
        </button>
      </form>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href={
            qUrl
              ? `/${locale}/documents/?q=${encodeURIComponent(qUrl)}`
              : `/${locale}/documents/`
          }
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            !cat
              ? "bg-rka-navy text-white"
              : "bg-rka-muted text-rka-navy hover:bg-neutral-200"
          }`}
        >
          {ui.allCategories}
        </Link>
        {cats.map((c) => {
          const qs = new URLSearchParams();
          qs.set("cat", c);
          if (qUrl) qs.set("q", qUrl);
          return (
            <Link
              key={c}
              href={`/${locale}/documents/?${qs}`}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                cat === c
                  ? "bg-rka-navy text-white"
                  : "bg-rka-muted text-rka-navy hover:bg-neutral-200"
              }`}
            >
              {documentCategories[c][locale]}
            </Link>
          );
        })}
      </div>

      <ul className="mt-10 divide-y divide-neutral-100 rounded-2xl border border-neutral-200/90 bg-white shadow-md shadow-neutral-900/5">
        {list.map((doc) => (
          <li key={doc.id}>
            <a
              href={doc.href}
              download={doc.fileName}
              className="flex items-start gap-3 px-4 py-4 hover:bg-rka-muted/50"
            >
              <FileText
                className="mt-0.5 h-5 w-5 shrink-0 text-rka-accent"
                aria-hidden
              />
              <span className="flex-1">
                <span className="font-medium text-rka-navy">
                  {doc.title[locale]}
                </span>
                <span className="mt-1 block text-xs text-neutral-500">
                  {documentCategories[doc.category][locale]} · {doc.fileName}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-rka-accent">
                {ui.download}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {list.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-500">
          {locale === "ru"
            ? "Ничего не найдено."
            : locale === "kk"
              ? "Ештеңе табылмады."
              : "No results."}
        </p>
      ) : null}
      </div>
    </main>
  );
}
