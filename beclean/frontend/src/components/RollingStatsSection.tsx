"use client";

import { useEffect, useRef, useState } from "react";

const DIGIT_H = 56;
const CYCLES = 3;

function DigitRoller({
  targetDigit,
  active,
  delayMs,
}: {
  targetDigit: number;
  active: boolean;
  delayMs: number;
}) {
  const finalIndex = (CYCLES - 1) * 10 + targetDigit;
  const strip = Array.from({ length: CYCLES * 10 }, (_, i) => i % 10);

  return (
    <div className="relative inline-block h-14 min-w-[2.25rem] overflow-hidden align-bottom md:min-w-[2.5rem]">
      <div
        className="flex flex-col transition-transform duration-[2200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: `translateY(${active ? -finalIndex * DIGIT_H : 0}px)`,
          transitionDelay: `${delayMs}ms`,
        }}
      >
        {strip.map((d, i) => (
          <div
            key={i}
            className="flex h-14 shrink-0 items-center justify-center text-4xl font-bold tracking-tight text-slate-900 tabular-nums md:text-5xl"
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

function RollingStat({
  value,
  label,
  active,
  delayBase,
}: {
  value: number;
  label: string;
  active: boolean;
  delayBase: number;
}) {
  const digits = String(Math.max(0, Math.floor(value))).split("");

  return (
    <div className="flex flex-col items-center px-2">
      <div className="flex items-end justify-center">
        {digits.map((ch, i) => (
          <DigitRoller
            key={`${value}-${i}`}
            targetDigit={Number(ch)}
            active={active}
            delayMs={active ? delayBase + i * 75 : 0}
          />
        ))}
        <span
          className="mb-2 ml-0.5 select-none text-lg font-bold leading-none text-red-500 md:text-xl"
          aria-hidden
        >
          +
        </span>
      </div>
      <p className="mt-4 max-w-[14rem] text-center text-sm font-medium leading-snug text-slate-500 md:text-base">
        {label}
      </p>
    </div>
  );
}

export function RollingStatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setActive(true);
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stats = [
    { value: 850, label: "Довольных клиентов после уборки", base: 0 },
    { value: 12, label: "Видов клининга и химчистки", base: 250 },
    { value: 6, label: "Лет команда на рынке", base: 500 },
  ] as const;

  return (
    <section
      ref={sectionRef}
      aria-label="Показатели Beclean"
      className="mb-12 rounded-2xl bg-white px-4 py-10 shadow-sm ring-1 ring-slate-200/80 md:px-8"
    >
      <div className="grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-6">
        {stats.map((s) => (
          <RollingStat
            key={s.label}
            value={s.value}
            label={s.label}
            active={active}
            delayBase={s.base}
          />
        ))}
      </div>
    </section>
  );
}
