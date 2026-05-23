"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Menu, X } from "lucide-react";

const NAVY = "#002d54";
const MUTED_BG = "#f5f5f5";

const navLinks = [
  ["О ПЛАТФОРМЕ", "/#about"],
  ["НОВОСТИ", "/#news"],
  ["ПАРТНЁРЫ", "/#partners"],
  ["АРХИВ", "/#archive"],
];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-neutral-800 antialiased">
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="Платформа Наставники России"
          >
            <Image
              src="/site-icon.svg"
              alt=""
              width={44}
              height={44}
              className="h-10 w-10 shrink-0 sm:h-11 sm:w-11"
              priority
            />
            <span className="hidden min-[380px]:block text-left font-extrabold uppercase leading-tight tracking-tight text-[#002d54] sm:text-lg">
              Наставники
              <br />
              <span className="bg-gradient-to-r from-[#5B1B95] to-[#cb11ab] bg-clip-text text-transparent">
                России
              </span>
            </span>
          </Link>

          <nav
            className="order-last hidden w-full justify-center gap-6 text-xs font-semibold uppercase tracking-wide text-[#002d54] lg:order-none lg:flex lg:w-auto lg:gap-8"
            aria-label="Основное меню"
          >
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className="hover:text-[#cb11ab]">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/#about"
              className="hidden rounded-md border border-[#002d54] bg-[#002d54] px-3 py-2 text-xs font-bold uppercase text-white shadow-sm transition hover:opacity-95 sm:inline-flex"
            >
              НАСТАВНИКИ РОССИИ
            </a>
            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-[#5B1B95] to-[#cb11ab] px-4 py-2.5 text-xs font-bold uppercase text-white shadow-sm transition hover:opacity-95 sm:px-5 sm:text-sm"
            >
              ПОДАТЬ ЗАЯВКУ
            </button>
            <button
              type="button"
              className="p-2 text-[#002d54] lg:hidden"
              aria-label="Меню"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-6 w-6" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-[#002d54] text-white lg:hidden"
          role="dialog"
          aria-modal
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="font-bold">Меню</span>
            <button
              type="button"
              aria-label="Закрыть"
              className="p-2"
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-6 py-6 text-base font-medium">
            {navLinks.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="border-b border-white/10 py-3"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            <a
              href="/#about"
              className="border-b border-white/10 py-3"
              onClick={() => setMenuOpen(false)}
            >
              НАСТАВНИКИ РОССИИ
            </a>
          </nav>
        </div>
      ) : null}

      {children}

      <footer style={{ backgroundColor: NAVY }} className="text-white">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-8 border-b border-white/15 pb-8 md:flex-row md:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Image
                  src="/site-icon.svg"
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12"
                />
                <span className="text-lg font-bold leading-tight">
                  Платформа
                  <br />
                  <span className="bg-gradient-to-r from-[#e879f9] to-[#cb11ab] bg-clip-text text-transparent">
                    «Наставники России»
                  </span>
                </span>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-white/90">
                «Наставники России» — платформа для руководителей и команд,
                развивающих проекты в экосистеме маркетплейсов.
              </p>
              <nav className="flex flex-col gap-2 text-sm text-white/85">
                <Link href="/#about" className="hover:underline">
                  О платформе
                </Link>
                <Link href="/#news" className="hover:underline">
                  Новости
                </Link>
                <Link href="/#partners" className="hover:underline">
                  Партнёры
                </Link>
                <Link href="/#archive" className="hover:underline">
                  Архив
                </Link>
              </nav>
            </div>
            <div className="text-sm text-white/90">
              <p className="font-semibold">Контакты</p>
              <p className="mt-3 leading-relaxed">
                ООО «ВАЙЛДБЕРРИЗ»
                <br />
                142181, Московская область, д.&nbsp;Коледино, д.&nbsp;6,
                стр.&nbsp;1
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} Платформа «Наставники России». Все права
              защищены.
            </span>
            <div className="flex gap-4">
              <Link href="/" className="hover:underline">
                Политика конфиденциальности
              </Link>
              <Link href="/" className="hover:underline">
                Условия использования
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ArticleSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-stretch gap-3 text-xl font-bold text-[#002d54] sm:text-2xl">
      <span
        className="w-1.5 shrink-0 rounded-sm bg-gradient-to-b from-[#5B1B95] to-[#cb11ab]"
        aria-hidden
      />
      <span className="pt-0.5 leading-snug">{children}</span>
    </h2>
  );
}

export { ArticleSectionTitle };
