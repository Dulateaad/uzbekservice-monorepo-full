'use client';

import Image from 'next/image';
import { BadgePercent, Percent, ShieldCheck } from 'lucide-react';
import { useDictionary } from '@/contexts/dictionary-context';
import { Clock, ThumbsUp, UserRound, Wallet } from 'lucide-react';

export function HomeHeroFairPrice() {
  const t = useDictionary();
  const h = t.HomePage;

  const features = [
    {
      title: h.hero_feature_fast_title,
      desc: h.hero_feature_fast_desc,
      Icon: Clock,
    },
    {
      title: h.hero_feature_staff_title,
      desc: h.hero_feature_staff_desc,
      Icon: UserRound,
    },
    {
      title: h.hero_feature_guarantee_title,
      desc: h.hero_feature_guarantee_desc,
      Icon: ThumbsUp,
    },
    {
      title: h.hero_feature_price_title,
      desc: h.hero_feature_price_desc,
      Icon: Wallet,
    },
  ];

  return (
    <section className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/hero-fair-price.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/92 to-white/45 md:via-white/85 md:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/30 md:from-white/80" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1792px] flex-col px-4 pb-10 pt-8 md:px-6 md:pb-16 md:pt-12">
        <div className="max-w-xl">
          <h1 className="font-headline text-3xl font-extrabold leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-5xl">
            <span className="block">
              {h.hero_headline_lead}{' '}
              <span className="text-emerald-600">{h.hero_headline_accent}</span>
            </span>
          </h1>

          <ul className="mt-8 space-y-4 text-base leading-snug text-foreground/90 md:text-lg">
            <li className="flex gap-3">
              <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Percent className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <span>{h.hero_bullet_1}</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <span>{h.hero_bullet_2}</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <BadgePercent className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <span>
                {h.hero_bullet_3_prefix}{' '}
                <span className="font-semibold text-emerald-600">{h.hero_bullet_3_accent}</span>
              </span>
            </li>
          </ul>
        </div>

        <div className="mt-12 grid gap-3 rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-black/5 backdrop-blur-sm sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-4 lg:p-6">
          {features.map(({ title, desc, Icon }) => (
            <div
              key={title}
              className="flex gap-3 rounded-xl border border-emerald-100/80 bg-white/80 p-4 dark:bg-card/80"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold leading-tight text-foreground">{title}</p>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
