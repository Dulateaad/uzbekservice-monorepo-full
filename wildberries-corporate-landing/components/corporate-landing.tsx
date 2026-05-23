"use client";

import Image from "next/image";
import Link from "next/link";
import React, { FormEvent, useRef, useState } from "react";
import { ArrowDown, Check, Menu, Send, X } from "lucide-react";

const NAVY = "#002d54";
const WB_PURPLE = "#5B1B95";
const WB_MAGENTA = "#cb11ab";
const MUTED_BG = "#f5f5f5";

type NewsItem = {
  date: string;
  tag: string;
  title: string;
  excerpt: string;
  img: string;
  /** Ссылка на материал на сайте */
  href?: string;
};

const heroHandshake =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1600&q=80";

/** Стоковые фото групп людей (Unsplash), единый деловой стиль */
const directionCards = [
  {
    title: "КОРПОРАТИВНЫЕ КОМАНДЫ",
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
    lines: [
      "Возможность участия в работе с бизнес-структурами и партнёрскими проектами платформы.",
      "Участие в развитии коммерческих направлений, управление процессами и реализация задач в рамках действующих проектов.",
    ],
  },
  {
    title: "ГОСУДАРСТВЕННЫЕ ПРОЕКТЫ И КОМАНДЫ",
    img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
    lines: [
      "Участие в проектах с государственным и общественным сектором.",
      "Работа в командах, направленных на развитие, координацию и реализацию управленческих решений.",
    ],
  },
  {
    title: "УПРАВЛЕНЧЕСКИЕ КОМАНДЫ",
    img: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
    lines: [
      "Возможность занять позиции в управлении командами и процессами внутри платформы.",
      "Организация работы, контроль выполнения задач и развитие направлений.",
    ],
  },
  {
    title: "СБОРНЫЕ ПРОЕКТНЫЕ КОМАНДЫ",
    img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=80",
    lines: [
      "Формирование команд под конкретные задачи и проекты.",
      "Участие в реализации масштабных инициатив и работа с различными направлениями платформы.",
    ],
  },
];

const opportunities = [
  "Доступ к образовательным модулям и экспертам отрасли",
  "Сопровождение наставников и развитие управленческих компетенций",
  "Работа над реальными кейсами маркетплейсов и экосистем",
  "Нетворкинг с участниками и партнёрами программы",
  "Возможность получить грант на развитие проекта",
];

const stats = [
  { value: "100 000", label: "Регистраций" },
  { value: "3 000", label: "Полуфиналистов" },
  { value: "400", label: "Победитель" },
  { value: "650", label: "Назначений" },
];

const newsItems: NewsItem[] = [
  {
    date: "03.04.2026",
    tag: "Наставники",
    title:
      "Портрет наставника: Елена Громова на платформе WB «Наставники России»",
    excerpt:
      "Опыт сопровождения участников, сертификат наставника и вклад в развитие команд на маркетплейсе.",
    img: "/mentors/elena-gromova.png",
    href: "/mentors/elena-gromova/",
  },
  {
    date: "31.03.2026",
    tag: "Платформа",
    title:
      "Как команды работают с модулями сопровождения на платформе WB «Наставники России»",
    excerpt:
      "Слаженность процессов, прозрачные сценарии взаимодействия и поддержка наставников в ежедневной работе.",
    img: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80",
  },
  {
    date: "27.03.2026",
    tag: "Команды",
    title:
      "Сотни управленческих команд подключены к программам платформы WB «Наставники России»",
    excerpt:
      "Расширение охвата регионов и форматов работы: от проектных спринтов до долгосрочного наставничества.",
    img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=400&q=80",
  },
  {
    date: "22.03.2026",
    tag: "Обновления",
    title: "Новые сценарии обучения на платформе для руководителей направлений",
    excerpt:
      "Материалы и воркшопы адаптированы под задачи экосистемы маркетплейсов и партнёрских проектов.",
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80",
  },
  {
    date: "18.03.2026",
    tag: "Интервью",
    title:
      "Эксперты платформы WB «Наставники России» о роли наставника в цифровой среде",
    excerpt:
      "Обсуждение компетенций, обратной связи и выстраивания доверия между участниками и командами сопровождения.",
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
  },
  {
    date: "10.03.2026",
    tag: "Анонс",
    title: "Расписание встреч с наставниками платформы на второй квартал 2026 года",
    excerpt:
      "Онлайн и гибридные форматы: регистрация для участников открыта в личном кабинете платформы.",
    img: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=400&q=80",
  },
  {
    date: "05.03.2026",
    tag: "Партнёры",
    title:
      "Партнёрские организации усиливают поддержку участников платформы WB «Наставники России»",
    excerpt:
      "Совместные инициативы по развитию компетенций и доступ к инфраструктуре для команд проектов.",
    img: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=400&q=80",
  },
];

const partners = [
  "Газпром",
  "Роснефть",
  "РЖД",
  "Ростех",
  "Сбер",
  "ВТБ",
  "Лукойл",
  "Норникель",
  "РусГидро",
  "Транснефть",
  "Россети",
  "Татнефть",
];

const navLinks = [
  ["О ПЛАТФОРМЕ", "#about"],
  ["НОВОСТИ", "#news"],
  ["ПАРТНЁРЫ", "#partners"],
  ["АРХИВ", "#archive"],
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-6 flex items-stretch gap-3 text-lg font-bold text-[#002d54] sm:mb-8 sm:text-xl md:text-2xl">
      <span
        className="w-1.5 shrink-0 rounded-sm bg-gradient-to-b from-[#5B1B95] to-[#cb11ab]"
        aria-hidden
      />
      <span className="pt-0.5 leading-tight">{children}</span>
    </h2>
  );
}

export function CorporateLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", direction: "", message: "" });
  const [formSent, setFormSent] = useState(false);
  const [formSending, setFormSending] = useState(false);

  function handleApply(e: FormEvent) {
    e.preventDefault();
    setFormSending(true);
    setTimeout(() => {
      setFormSending(false);
      setFormSent(true);
    }, 1200);
  }

  return (
    <div className="min-h-screen bg-white text-neutral-800 antialiased">
      {/* Header: без «Личного кабинета» и без отдельной плашки WB — только логотип проекта */}
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
              <a
                key={href}
                href={href}
                className="hover:text-[#cb11ab]"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#about"
              className="hidden rounded-md border border-[#002d54] bg-[#002d54] px-3 py-2 text-xs font-bold uppercase text-white shadow-sm transition hover:opacity-95 sm:inline-flex"
            >
              НАСТАВНИКИ РОССИИ
            </a>
            <a
              href="#apply"
              className="rounded-full bg-gradient-to-r from-[#5B1B95] to-[#cb11ab] px-4 py-2.5 text-xs font-bold uppercase text-white shadow-sm transition hover:opacity-95 sm:px-5 sm:text-sm"
            >
              ПОДАТЬ ЗАЯВКУ
            </a>
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
              href="#about"
              className="border-b border-white/10 py-3"
              onClick={() => setMenuOpen(false)}
            >
              НАСТАВНИКИ РОССИИ
            </a>
          </nav>
        </div>
      ) : null}

      {/* Hero: фото целиком без обрезки (object-contain), затемнение и текст поверх */}
      <section className="relative overflow-hidden bg-[#002d54]">
        <div className="relative mx-auto max-w-[1600px]">
          <Image
            src={heroHandshake}
            alt=""
            width={1600}
            height={1067}
            className="mx-auto h-auto w-full max-h-[min(88vh,1200px)] object-contain object-center"
            sizes="100vw"
            priority
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[#002d54]/80"
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-10 sm:px-6 sm:py-14 md:py-16">
              <p className="text-xl font-extrabold uppercase leading-tight tracking-tight drop-shadow-md sm:text-2xl md:text-3xl">
                <span className="bg-gradient-to-r from-[#e879f9] via-[#cb11ab] to-[#c026d3] bg-clip-text text-transparent">
                  НОВЫЙ ФОРМАТ
                </span>
              </p>
              <h1 className="text-2xl font-extrabold uppercase leading-tight tracking-tight text-white drop-shadow-md sm:text-3xl md:text-4xl lg:text-[2.35rem]">
                УЧАСТВУЙТЕ
                <br />
                КОМАНДОЙ
              </h1>
              <p className="max-w-[720px] text-sm leading-relaxed text-white/95 drop-shadow-sm sm:text-base md:text-lg">
                Платформа WB «Наставники России» — открытое пространство Wildberries для
                руководителей и команд: развитие маркетплейсов и возможность получить грант
                до 10 000 000 рублей.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Направления */}
      <section id="about" className="scroll-mt-24 border-t border-neutral-100">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14 md:py-16">
          <SectionTitle>НАПРАВЛЕНИЯ ПЛАТФОРМЫ</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            {directionCards.map((d) => (
              <article
                key={d.title}
                className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
              >
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src={d.img}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:640px) 100vw, 50vw"
                  />
                </div>
                <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
                  <h3
                    className="text-center text-sm font-bold uppercase leading-snug sm:text-base"
                    style={{
                      background: `linear-gradient(135deg, ${WB_PURPLE}, ${WB_MAGENTA})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {d.title}
                  </h3>
                  {d.lines.map((line) => (
                    <p
                      key={line}
                      className="text-sm leading-relaxed text-neutral-600"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Возможности */}
      <section style={{ backgroundColor: MUTED_BG }}>
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
          <SectionTitle>ПЛАТФОРМА ОТКРЫВАЕТ ВОЗМОЖНОСТИ</SectionTitle>
          <ul className="space-y-3 md:space-y-4">
            {opportunities.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `linear-gradient(145deg, ${WB_PURPLE}, ${WB_MAGENTA})`,
                  }}
                >
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </span>
                <span className="text-sm leading-relaxed text-[#002d54] sm:text-base">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Цифры */}
      <section id="stats" className="scroll-mt-24 border-t border-neutral-100 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
          <SectionTitle>
            ПЛАТФОРМА{" "}
            <span className="bg-gradient-to-r from-[#5B1B95] to-[#cb11ab] bg-clip-text text-transparent">
              «НАСТАВНИКИ РОССИИ»
            </span>{" "}
            В ЦИФРАХ:
          </SectionTitle>
          <div className="mx-auto grid max-w-[720px] grid-cols-2 gap-4 sm:max-w-none sm:gap-6 md:max-w-[900px] lg:max-w-[1000px]">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-5 text-center shadow-sm sm:px-5 sm:py-6"
              >
                <p
                  className="text-xl font-extrabold tabular-nums sm:text-2xl md:text-3xl"
                  style={{
                    color: NAVY,
                  }}
                >
                  {s.value}
                </p>
                <span
                  className="my-3 h-px w-full max-w-[120px] bg-gradient-to-r from-transparent via-[#cb11ab]/50 to-transparent"
                  aria-hidden
                />
                <p className="text-xs text-neutral-600 sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Новости */}
      <section id="news" className="scroll-mt-24 border-t border-neutral-100">
        <div
          className="py-3 text-center text-sm font-bold uppercase tracking-wider text-white sm:text-base"
          style={{
            background: `linear-gradient(90deg, ${WB_PURPLE}, ${WB_MAGENTA})`,
          }}
        >
          НОВОСТИ ПЛАТФОРМЫ
        </div>
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
          <ul className="space-y-6">
            {newsItems.map((n) => (
              <li
                key={`${n.date}-${n.title}`}
                className="flex gap-4 border-b border-neutral-200 pb-6 last:border-0 last:pb-0"
              >
                <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-36">
                  <Image
                    src={n.img}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="144px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-neutral-400">
                    {n.date} · {n.tag}
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-[#002d54] sm:text-base">
                    {n.href ? (
                      <Link
                        href={n.href}
                        className="transition hover:text-[#cb11ab]"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      n.title
                    )}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-neutral-600 sm:text-sm">
                    {n.excerpt}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#5B1B95] to-[#cb11ab] px-6 py-2.5 text-sm font-bold uppercase text-white shadow-md transition hover:opacity-95"
            >
              <span>Все новости</span>
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Партнёры */}
      <section id="partners" className="scroll-mt-24 border-t border-neutral-100 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14 md:py-16">
          <SectionTitle>ПАРТНЁРЫ ПЛАТФОРМЫ</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {partners.map((name) => (
              <div
                key={name}
                className="flex aspect-[5/3] items-center justify-center rounded-lg border border-neutral-200 bg-white px-2 text-center text-xs font-semibold text-neutral-500 shadow-sm sm:text-sm"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Архив (якорь) */}
      <section id="archive" className="scroll-mt-24 border-t border-neutral-100 py-8 text-center text-sm text-neutral-500">
        <p>Материалы прошлых сезонов доступны по запросу в оргкомитете.</p>
      </section>

      {/* Форма заявки */}
      <section
        id="apply"
        className="scroll-mt-24 border-t border-neutral-100"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0a1628 100%)` }}
      >
        <div className="mx-auto max-w-[720px] px-4 py-12 sm:px-6 sm:py-16 md:py-20">
          <h2 className="mb-2 text-center text-2xl font-extrabold uppercase tracking-wide text-white sm:text-3xl">
            Подать заявку
          </h2>
          <p className="mx-auto mb-10 max-w-md text-center text-sm leading-relaxed text-white/70">
            Заполните форму, и мы свяжемся с вами для уточнения деталей участия в платформе.
          </p>

          {formSent ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center backdrop-blur-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#5B1B95] to-[#cb11ab]">
                <Check className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Заявка отправлена!</h3>
              <p className="max-w-sm text-sm text-white/70">
                Спасибо за интерес к платформе «Наставники России». Мы свяжемся с вами в ближайшее время.
              </p>
              <button
                type="button"
                onClick={() => { setFormSent(false); setFormData({ name: "", email: "", phone: "", direction: "", message: "" }); }}
                className="mt-4 rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Отправить ещё
              </button>
            </div>
          ) : (
            <form onSubmit={handleApply} className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Имя и фамилия <span className="text-[#cb11ab]">*</span>
                  </span>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Иван Петров"
                    className="w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#cb11ab] focus:ring-1 focus:ring-[#cb11ab]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Электронная почта <span className="text-[#cb11ab]">*</span>
                  </span>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ivan@example.com"
                    className="w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#cb11ab] focus:ring-1 focus:ring-[#cb11ab]"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Телефон
                  </span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                    className="w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#cb11ab] focus:ring-1 focus:ring-[#cb11ab]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Направление
                  </span>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    className="w-full appearance-none rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-[#cb11ab] focus:ring-1 focus:ring-[#cb11ab]"
                  >
                    <option value="" className="bg-[#002d54]">Выберите направление</option>
                    <option value="corporate" className="bg-[#002d54]">Корпоративные команды</option>
                    <option value="government" className="bg-[#002d54]">Государственные проекты</option>
                    <option value="management" className="bg-[#002d54]">Управленческие команды</option>
                    <option value="project" className="bg-[#002d54]">Сборные проектные команды</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
                  Сообщение
                </span>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Расскажите кратко о себе и вашем интересе к платформе..."
                  className="w-full resize-none rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#cb11ab] focus:ring-1 focus:ring-[#cb11ab]"
                />
              </label>

              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formSending}
                  className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#5B1B95] to-[#cb11ab] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition hover:opacity-95 disabled:opacity-60"
                >
                  {formSending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Отправка…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Отправить заявку
                    </>
                  )}
                </button>
                <p className="text-xs text-white/40">
                  Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
                </p>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
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
                <a href="#about" className="hover:underline">
                  О платформе
                </a>
                <a href="#news" className="hover:underline">
                  Новости
                </a>
                <a href="#partners" className="hover:underline">
                  Партнёры
                </a>
                <a href="#archive" className="hover:underline">
                  Архив
                </a>
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
              <a href="/" className="hover:underline">
                Политика конфиденциальности
              </a>
              <a href="/" className="hover:underline">
                Условия использования
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
