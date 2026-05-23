import type { Locale } from "./i18n";

export type L<T = string> = Record<Locale, T>;

export type NewsCategory = "events" | "appointments" | "practice";

export type NewsItem = {
  slug: string;
  date: string;
  category: NewsCategory;
  image: string;
  title: L;
  excerpt: L;
  body: L;
  /** Подпись к главному фото (как на новостных сайтах) */
  imageCredit?: L;
  /** Тематические метки */
  tags?: L[];
  attachments?: { label: L; href: string }[];
};

export type StatementItem = {
  slug: string;
  date: string;
  title: L;
};

export type DocumentCategory =
  | "decisions"
  | "projects"
  | "discipline"
  | "legislation";

export type DocumentItem = {
  id: string;
  category: DocumentCategory;
  title: L;
  href: string;
  fileName: string;
};

export type ActivityTile = {
  slug: string;
  image: string;
  title: L;
};

export const newsCategories: Record<
  NewsCategory,
  L
> = {
  events: {
    kk: "Іс-шаралар",
    ru: "Мероприятия",
    en: "Events",
  },
  appointments: {
    kk: "Тағайындаулар",
    ru: "Назначения",
    en: "Appointments",
  },
  practice: {
    kk: "Тәжірибе",
    ru: "Практика",
    en: "Practice",
  },
};

export const documentCategories: Record<DocumentCategory, L> = {
  decisions: {
    kk: "Шешімдер",
    ru: "Решения",
    en: "Decisions",
  },
  projects: {
    kk: "Жобалар",
    ru: "Проекты",
    en: "Drafts",
  },
  discipline: {
    kk: "Тәртіптік тәжірибе",
    ru: "Дисциплинарная практика",
    en: "Disciplinary practice",
  },
  legislation: {
    kk: "Заңнама",
    ru: "Законодательство",
    en: "Legislation",
  },
};

export const newsItems: NewsItem[] = [
  {
    slug: "presidium-astana-2024",
    date: "2024-04-24",
    category: "events",
    image:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&q=80",
    title: {
      kk: "РҚА Президиумының отырысы Астанада өтті",
      ru: "Заседание Президиума РКА состоялось в Астане",
      en: "RKA Presidium meeting held in Astana",
    },
    excerpt: {
      kk: "Күн тәртібінде адвокаттық қызметті дамыту және халықаралық ынтымақтастық мәселелері қаралды.",
      ru: "На повестке дня — развитие адвокатуры и вопросы международного сотрудничества.",
      en: "Agenda items included development of the legal profession and international cooperation.",
    },
    body: {
      kk: "Толық мәтінді кейін редакция арқылы жүктеуге болады. Бұл демо нұсқа.",
      ru: "Полный текст публикуется через редакционную систему. Это демонстрационная версия.",
      en: "Full text would be managed in the CMS. This is demo content.",
    },
    imageCredit: {
      kk: "РҚА баспасөз қызметі (демо).",
      ru: "Пресс-служба РКА (демо).",
      en: "RKA press service (demo).",
    },
    tags: [
      { kk: "Президиум", ru: "Президиум", en: "Presidium" },
      { kk: "Астана", ru: "Астана", en: "Astana" },
      { kk: "Адвокатура", ru: "Адвокатура", en: "Legal profession" },
    ],
    attachments: [
      {
        label: {
          kk: "Қорытынды хаттама (PDF)",
          ru: "Итоговый протокол (PDF)",
          en: "Final minutes (PDF)",
        },
        href: "#",
      },
    ],
  },
  {
    slug: "forum-almaty",
    date: "2024-04-26",
    category: "events",
    image:
      "https://images.unsplash.com/photo-1560439514-4e9645039924?w=800&q=80",
    title: {
      kk: "Алматыда заңгерлік форум аяқталды",
      ru: "В Алматы завершился юридический форум",
      en: "Legal forum concluded in Almaty",
    },
    excerpt: {
      kk: "Қатысушылар реформалар мен адвокаттық кепілдіктер талқыланды.",
      ru: "Обсуждены реформы и гарантии адвокатской деятельности.",
      en: "Reforms and safeguards for legal practice were discussed.",
    },
    body: {
      kk: "Форум қорытындысы бойынша ұсынымдар әзірленуде.",
      ru: "По итогам форума готовятся рекомендации.",
      en: "Recommendations are being prepared following the forum.",
    },
    tags: [
      { kk: "Форум", ru: "Форум", en: "Forum" },
      { kk: "Алматы", ru: "Алматы", en: "Almaty" },
      { kk: "Реформалар", ru: "Реформы", en: "Reforms" },
    ],
  },
  {
    slug: "roundtable-reforms",
    date: "2024-04-23",
    category: "practice",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
    title: {
      kk: "Реформалар туралы дөңгелек үстел",
      ru: "Круглый стол по вопросам реформ",
      en: "Round table on reforms",
    },
    excerpt: {
      kk: "Сарапшылар заңнама жобаларын талқылады.",
      ru: "Эксперты обсудили законопроекты.",
      en: "Experts reviewed draft legislation.",
    },
    body: {
      kk: "Материалдар жақында жарияланады.",
      ru: "Материалы будут опубликованы в ближайшее время.",
      en: "Materials will be published shortly.",
    },
    tags: [
      { kk: "Заңнама", ru: "Законодательство", en: "Legislation" },
      { kk: "Талқылау", ru: "Обсуждение", en: "Discussion" },
    ],
  },
  {
    slug: "appointments-order",
    date: "2024-04-22",
    category: "appointments",
    image:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80",
    title: {
      kk: "Лауазымды тағайындаулар туралы бұйрық",
      ru: "Приказ о служебных назначениях",
      en: "Order on official appointments",
    },
    excerpt: {
      kk: "РҚА құрылымындағы өзгерістер күшіне енді.",
      ru: "Изменения в структуре РКА вступили в силу.",
      en: "Structural changes within the RKA took effect.",
    },
    body: {
      kk: "Толық мәтін құжаттар бөлімінде.",
      ru: "Полный текст в разделе документов.",
      en: "Full text in the documents section.",
    },
  },
  {
    slug: "cooperation-memo",
    date: "2024-04-21",
    category: "events",
    image:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80",
    title: {
      kk: "Халықаралық ынтымақтастық туралы меморандум",
      ru: "Меморандум о международном сотрудничестве",
      en: "Memorandum on international cooperation",
    },
    excerpt: {
      kk: "Жаңа серіктестік бағыттары ашылды.",
      ru: "Открыты новые направления партнёрства.",
      en: "New partnership directions were opened.",
    },
    body: {
      kk: "Толығырақ жаңалықтарда.",
      ru: "Подробнее в новостях.",
      en: "More details in the news section.",
    },
  },
  {
    slug: "ethics-guidelines",
    date: "2024-04-20",
    category: "practice",
    image:
      "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800&q=80",
    title: {
      kk: "Әдеп нормалары жаңартылды",
      ru: "Обновлены этические стандарты",
      en: "Ethical standards updated",
    },
    excerpt: {
      kk: "Адвокаттар үшін нұсқаулықтың жаңа нұсқасы.",
      ru: "Новая редакция методических рекомендаций.",
      en: "New edition of practice guidelines.",
    },
    body: {
      kk: "Құжаттар бөлімінен жүктеп алыңыз.",
      ru: "Доступно для скачивания в разделе документов.",
      en: "Available for download in the documents section.",
    },
  },
];

export const statements: StatementItem[] = [
  {
    slug: "position-court-reform",
    date: "2024-04-18",
    title: {
      kk: "Сот реформасы жөніндегі ұстаным",
      ru: "Позиция РКА относительно судебной реформы",
      en: "RKA position on judicial reform",
    },
  },
  {
    slug: "statement-access-justice",
    date: "2024-04-12",
    title: {
      kk: "Әділ сотқа қолжетімділік туралы мәлімдеме",
      ru: "Заявление о доступе к правосудию",
      en: "Statement on access to justice",
    },
  },
  {
    slug: "position-advocacy-guarantees",
    date: "2024-04-05",
    title: {
      kk: "Адвокаттық кепілдіктерді нығайту",
      ru: "Об усилении гарантий адвокатской деятельности",
      en: "On strengthening safeguards for advocates",
    },
  },
];

export const documents: DocumentItem[] = [
  {
    id: "d1",
    category: "decisions",
    title: {
      kk: "Президиум шешімі №12",
      ru: "Решение Президиума №12",
      en: "Presidium decision No. 12",
    },
    href: "#",
    fileName: "decision-12.pdf",
  },
  {
    id: "d2",
    category: "projects",
    title: {
      kk: "Заңнамаға түзетулер жобасы",
      ru: "Проект изменений в законодательство",
      en: "Draft amendments to legislation",
    },
    href: "#",
    fileName: "draft-amendments.pdf",
  },
  {
    id: "d3",
    category: "legislation",
    title: {
      kk: "Әділет министрлігімен бірлескен нұсқаулық",
      ru: "Методические рекомендации совместно с Минюстом",
      en: "Joint guidelines with the Ministry of Justice",
    },
    href: "#",
    fileName: "guidelines.pdf",
  },
  {
    id: "d4",
    category: "discipline",
    title: {
      kk: "Тәртіптік іс жүргізу қорытындылары (жинақ)",
      ru: "Обобщение дисциплинарной практики",
      en: "Summary of disciplinary practice",
    },
    href: "#",
    fileName: "discipline-summary.pdf",
  },
  {
    id: "d5",
    category: "decisions",
    title: {
      kk: "Кеңес отырысының хаттамасы",
      ru: "Протокол заседания Совета",
      en: "Council meeting minutes",
    },
    href: "#",
    fileName: "council-minutes.pdf",
  },
  {
    id: "d6",
    category: "legislation",
    title: {
      kk: "Қолданыстағы нормативтік база",
      ru: "Действующая нормативная база",
      en: "Current regulatory framework",
    },
    href: "#",
    fileName: "regulatory-index.pdf",
  },
];

export const activities: ActivityTile[] = [
  {
    slug: "training",
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900&q=80",
    title: {
      kk: "Біліктілікті арттыру",
      ru: "Повышение квалификации",
      en: "Professional development",
    },
  },
  {
    slug: "rights",
    image:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=900&q=80",
    title: {
      kk: "Адвокаттар құқықтарын қорғау",
      ru: "Защита прав адвокатов",
      en: "Protection of advocates' rights",
    },
  },
  {
    slug: "international",
    image:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=900&q=80",
    title: {
      kk: "Халықаралық қызмет",
      ru: "Международная деятельность",
      en: "International activity",
    },
  },
];

export const chamberRegions: { id: string; name: L }[] = [
  { id: "abay", name: { kk: "Абай облысы", ru: "Область Абай", en: "Abai Region" } },
  { id: "akmola", name: { kk: "Ақмола облысы", ru: "Акмолинская область", en: "Akmola Region" } },
  { id: "aktobe", name: { kk: "Ақтөбе облысы", ru: "Актюбинская область", en: "Aktobe Region" } },
  { id: "almaty", name: { kk: "Алматы облысы", ru: "Алматинская область", en: "Almaty Region" } },
  { id: "atyrau", name: { kk: "Атырау облысы", ru: "Атырауская область", en: "Atyrau Region" } },
  { id: "east", name: { kk: "Шығыс Қазақстан облысы", ru: "Восточно-Казахстанская область", en: "East Kazakhstan" } },
  { id: "zhambyl", name: { kk: "Жамбыл облысы", ru: "Жамбылская область", en: "Jambyl Region" } },
  { id: "jetisu", name: { kk: "Жетісу облысы", ru: "Область Жетысу", en: "Jetisu Region" } },
  { id: "west", name: { kk: "Батыс Қазақстан облысы", ru: "Западно-Казахстанская область", en: "West Kazakhstan" } },
  { id: "karaganda", name: { kk: "Қарағанды облысы", ru: "Карагандинская область", en: "Karaganda Region" } },
  { id: "kostanay", name: { kk: "Қостанай облысы", ru: "Костанайская область", en: "Kostanay Region" } },
  { id: "kyzylorda", name: { kk: "Қызылорда облысы", ru: "Кызылординская область", en: "Kyzylorda Region" } },
  { id: "mangystau", name: { kk: "Маңғыстау облысы", ru: "Мангистауская область", en: "Mangystau Region" } },
  { id: "pavlodar", name: { kk: "Павлодар облысы", ru: "Павлодарская область", en: "Pavlodar Region" } },
  { id: "north", name: { kk: "Солтүстік Қазақстан облысы", ru: "Северо-Казахстанская область", en: "North Kazakhstan" } },
  { id: "turkestan", name: { kk: "Түркістан облысы", ru: "Туркестанская область", en: "Turkestan Region" } },
  { id: "ulytau", name: { kk: "Ұлытау облысы", ru: "Область Ұлытау", en: "Ulytau Region" } },
];

export function getNewsBySlug(slug: string) {
  return newsItems.find((n) => n.slug === slug);
}

export function getRelatedNews(slug: string, limit: number) {
  return newsItems.filter((n) => n.slug !== slug).slice(0, limit);
}

export function formatDate(iso: string, locale: Locale) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(
    locale === "kk" ? "kk-KZ" : locale === "en" ? "en-GB" : "ru-RU",
    { day: "numeric", month: "long", year: "numeric" },
  );
}
