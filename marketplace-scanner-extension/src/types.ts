/** Одна строка выгрузки (согласовано с ТЗ). */
export type ItemRow = {
  source_url: string;
  title: string;
  description: string;
  price_current: string;
  price_old: string;
  currency: string;
  brand: string;
  sku: string;
  size_grid: string;
  image_urls: string;
  category_path: string;
  scraped_at: string;
};

export type ExtensionMessage = { type: "SCRAPE" };

export type ScrapeResponse =
  | { ok: true; row: ItemRow }
  | { ok: false; error: string };

export const STORAGE_KEY = "mscan_items_v1";

export const MAX_CELL_LEN = 32700;
