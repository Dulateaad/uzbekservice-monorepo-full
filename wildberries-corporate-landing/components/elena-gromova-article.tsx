"use client";

import Image from "next/image";
import Link from "next/link";
import { ArticleSectionTitle, SiteChrome } from "@/components/site-chrome";

export function ElenaGromovaArticle() {
  return (
    <SiteChrome>
      <article className="border-b border-neutral-100">
        <div className="mx-auto max-w-[760px] px-4 py-6 sm:px-6 sm:py-10">
          <nav
            className="mb-8 flex flex-wrap items-center gap-2 text-xs text-neutral-500 sm:text-sm"
            aria-label="Навигация"
          >
            <Link href="/" className="hover:text-[#cb11ab]">
              Главная
            </Link>
            <span aria-hidden>/</span>
            <span className="text-neutral-800">Материалы</span>
            <span aria-hidden>/</span>
            <span className="font-medium text-[#002d54]">Наставники</span>
          </nav>

          <div className="relative mb-8 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-100 shadow-lg sm:aspect-[16/10]">
            <Image
              src="/mentors/elena-gromova.png"
              alt="Елена Владимировна Громова — наставник платформы"
              fill
              className="object-cover object-top"
              sizes="(max-width:760px) 100vw, 760px"
              priority
            />
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#cb11ab]">
            Материалы · Портрет наставника
          </p>
          <h1 className="text-2xl font-extrabold leading-tight text-[#002d54] sm:text-3xl md:text-[2rem]">
            Громова Елена Владимировна
          </h1>
          <p className="mt-2 text-base font-semibold text-neutral-600 sm:text-lg">
            Новый наставник платформы
          </p>

          <div className="prose prose-neutral mt-10 max-w-none prose-p:leading-relaxed prose-p:text-neutral-700">
            <p>
              В феврале 2024 года к платформе наставников присоединилась Громова
              Елена Владимировна — специалист с практическим опытом работы в
              сфере выкупа и сопровождения участников.
            </p>
            <p>
              Елена начала свой путь как обычный участник, самостоятельно
              разбираясь в процессах и постепенно нарабатывая опыт. Уже в первый
              период работы она показала высокий уровень вовлечённости,
              внимательность к деталям и умение доводить результат до конца.
            </p>
            <p>
              По итогам прохождения этапов и внутренней оценки ей был выдан
              сертификат наставника платформы, подтверждающий компетенции и право
              работать с участниками.
            </p>

            <div className="my-10">
              <ArticleSectionTitle>
                Результаты и вклад в команду
              </ArticleSectionTitle>
              <p>
                За время работы на платформе Елена стала одной из ключевых
                наставниц и, по отзывам коллег, фактически — душой команды.
              </p>
              <p className="mb-3">
                Она выстроила стабильный поток работы с участниками и показывает
                высокие результаты по сопровождению:
              </p>
              <ul className="mb-6 list-none space-y-2 pl-0">
                {[
                  "регулярное закрытие лотов с доходностью в диапазоне 17–35%",
                  "успешное ведение участников с ростом дохода до 100.000+ рублей",
                  "отдельные кейсы участников с результатом до 150.000 рублей при старте с 30.000",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-neutral-700">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-[#5B1B95] to-[#cb11ab]"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p>
                Коллеги отмечают её сильные стороны — спокойный подход к работе,
                умение объяснить сложные моменты простым языком и доведение
                каждого участника до результата.
              </p>
            </div>

            <ArticleSectionTitle>Оценка внутри команды</ArticleSectionTitle>
            <p>
              Редакция платформы отдельно отмечает Елену как наставницу,
              которая не просто выполняет задачи, а создаёт комфортную рабочую
              среду для участников и команды.
            </p>
            <p>
              За счёт системного подхода и личного включения в процесс она
              обеспечивает стабильный результат и высокий уровень доверия со
              стороны участников.
            </p>

            <ArticleSectionTitle>Сегодня</ArticleSectionTitle>
            <p>
              На данный момент Елена продолжает работать с новыми и действующими
              участниками, развивает направление и принимает участие в
              масштабировании процессов внутри платформы.
            </p>
          </div>

          <aside className="mt-12 rounded-xl border border-neutral-200 bg-neutral-50/90 p-6 text-sm leading-relaxed text-neutral-700 shadow-sm">
            <p className="font-semibold text-[#002d54]">Контакты</p>
            <p className="mt-2">
              ООО «ВАЙЛДБЕРРИЗ»
              <br />
              142181, Московская область, д.&nbsp;Коледино, д.&nbsp;6, стр.&nbsp;1.
            </p>
          </aside>

          <div className="mt-10 border-t border-neutral-200 pt-8">
            <Link
              href="/#news"
              className="inline-flex items-center gap-2 font-semibold text-[#002d54] transition hover:text-[#cb11ab]"
            >
              ← Все материалы
            </Link>
          </div>
        </div>
      </article>
    </SiteChrome>
  );
}
