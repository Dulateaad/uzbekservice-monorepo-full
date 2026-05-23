import type { Product } from "@/lib/types";

export type CatalogProduct = Product & { id: string };

/**
 * Локальный каталог (картинки в /public/catalog/). Совпадающие id в Firestore не подмешиваются повторно.
 */
export const KIRA_CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: "jacket_black_gold_001",
    name: "Укороченный жакет с декоративными золотыми застёжками",
    description:
      "Элегантный укороченный жакет с архитектурным силуэтом и декоративными золотыми застёжками.",
    price: 128900,
    imageUrls: [
      "https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/5208617976892954348.jpg?alt=media&token=89fc989a-e361-447a-ba06-98dce2f8e1fc",
    ],
    category: "jacket",
    sizes: ["XS", "S", "M", "L"],
    colors: ["black"],
    ownerId: "kira-selection-owner",
  },
  {
    id: "dress_evening_black_002",
    name: "Вечернее платье-бюстье с драпировкой",
    description:
      "Скульптурное вечернее платье-бюстье с архитектурным силуэтом и драпировкой.",
    price: 189900,
    imageUrls: [
      "https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/IMG_6886%20(1).JPG?alt=media&token=cbefa4ee-f209-4a3c-a934-ce28258565ab",
    ],
    category: "dress",
    sizes: ["XS", "S", "M", "L"],
    colors: ["black"],
    ownerId: "kira-selection-owner",
  },
  {
    id: "skirt_leather_black_001",
    name: "Мини-юбка с драпировкой из эко-кожи",
    description: "Мини-юбка из эко-кожи с асимметричной драпировкой и высокой посадкой.",
    price: 64900,
    imageUrls: [
      "https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/IMG_6887.JPG?alt=media&token=429738be-9f45-4bac-a933-07a0513741a1",
    ],
    category: "skirt",
    sizes: ["XS", "S", "M", "L"],
    colors: ["black"],
    ownerId: "kira-selection-owner",
  },
  {
    id: "pants_lavender_tailored_001",
    name: "Брюки с высокой посадкой Lavender Tailored",
    description:
      "Широкие брюки с высокой посадкой в оттенке soft lavender. Создают вытянутый силуэт.",
    price: 72900,
    imageUrls: [
      "https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/IMG_6889.JPG?alt=media&token=70c4584a-f257-44c3-a236-cc3bcb43de97",
    ],
    category: "pants",
    sizes: ["XS", "S", "M", "L"],
    colors: ["lavender"],
    ownerId: "kira-selection-owner",
  },
  {
    id: "dress_scarlet_sculpt_001",
    name: "Платье мини Scarlet Sculpt",
    description: "Структурированное мини-платье scarlet red, формирующее выразительный силуэт.",
    price: 89900,
    imageUrls: [
      "https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/IMG_6890.JPG?alt=media&token=ef09395c-1546-4448-8c05-63a7e5f35cd7",
    ],
    category: "dress",
    sizes: ["XS", "S", "M", "L"],
    colors: ["scarlet red"],
    ownerId: "kira-selection-owner",
  },
  {
    id: "top_silk_aura_wrap_ivory_001",
    name: "Топ Silk Aura Wrap Ivory",
    description: "Элегантный wrap-топ ivory с драпировкой и струящимися рукавами.",
    price: 54900,
    imageUrls: [
      "https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/IMG_6893.JPG?alt=media&token=1b14ccf0-e6be-4535-83f6-a496b99d7895",
    ],
    category: "top",
    sizes: ["XS", "S", "M", "L"],
    colors: ["ivory"],
    ownerId: "kira-selection-owner",
  },
  {
    id: "sweatshirt_navy_zip_001",
    name: "Тёмно-синий свитшот на молнии с воротником",
    description:
      "Минималистичный свитшот глубокого синего цвета: воротник, металлическая молния до середины груди, рёбра на манжетах и по низу. Плотный трикотаж, комфортная посадка на каждый день.",
    price: 42900,
    imageUrls: ["/catalog/sweatshirt_navy_zip.png"],
    category: "sweatshirt",
    sizes: ["S", "M", "L", "XL"],
    colors: ["navy"],
    ownerId: "kira-selection-owner",
  },
  {
    id: "jeans_wide_black_wash_001",
    name: "Джинсы wide leg с высокой посадкой, умытый чёрный",
    description:
      "Прямые широкие джинсы с завышенной талией и классической пятикарманной конструкцией. Выбеленный чёрный деним с лёгким эффектом носки по бёдрам и коленям.",
    price: 55900,
    imageUrls: ["/catalog/jeans_wide_black_wash.png"],
    category: "jeans",
    sizes: ["25", "26", "27", "28", "29", "30"],
    colors: ["#1a1a1a"],
    ownerId: "kira-selection-owner",
  },
  {
    id: "shirt_charcoal_linen_001",
    name: "Рубашка с коротким рукавом, лён, графит",
    description:
      "Лёгкая рубашка на пуговицах с фактурой льна/льняной смеси, насыщенный графитовый оттенок. Укороченный рукав и свободный силуэт — для тёплой погоды и минималистичных образов.",
    price: 38900,
    imageUrls: ["/catalog/shirt_charcoal_linen.png"],
    category: "shirt",
    sizes: ["S", "M", "L", "XL"],
    colors: ["#4b5563"],
    ownerId: "kira-selection-owner",
  },
  {
    id: "coat_navy_long_001",
    name: "Пальто однобортное тёмно-синее, миди",
    description:
      "Строгое пальто миди из плотной ткани с благородной фактурой: отложной воротник, три тональные пуговицы, прорезные боковые карманы. Силуэт для офиса и города.",
    price: 198900,
    imageUrls: ["/catalog/coat_navy_long.png"],
    category: "coat",
    sizes: ["S", "M", "L"],
    colors: ["#0f172a"],
    ownerId: "kira-selection-owner",
  },
];

export const KIRA_CATALOG_ID_SET = new Set(KIRA_CATALOG_PRODUCTS.map((p) => p.id));

export function getCatalogProductById(id: string): CatalogProduct | undefined {
  return KIRA_CATALOG_PRODUCTS.find((p) => p.id === id);
}
