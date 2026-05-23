import type { ItemRow } from "./types";

function toAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return;
  try {
    return new URL(url.trim(), document.baseURI).href;
  } catch {
    return url.trim();
  }
}

function getMeta(key: string, by: "property" | "name" = "property"): string {
  const safe = key.replace(/"/g, '\\"');
  const el = document.querySelector(
    `meta[${by}="${safe}"]`,
  ) as HTMLMetaElement | null;
  return el?.content?.trim() ?? "";
}

function flattenJsonLd(value: unknown): unknown[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value === "object" && value !== null && "@graph" in value) {
    return flattenJsonLd((value as { "@graph": unknown }).@graph);
  }
  return [value];
}

function isProductType(t: unknown): boolean {
  const list = Array.isArray(t) ? t : t != null ? [t] : [];
  return list.some(
    (x) =>
      x === "Product" ||
      x === "http://schema.org/Product" ||
      x === "https://schema.org/Product",
  );
}

function extractProductFromJsonLd(): Record<string, unknown> | null {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );
  for (const s of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(s.textContent?.trim() || "{}");
    } catch {
      continue;
    }
    for (const node of flattenJsonLd(parsed)) {
      if (!node || typeof node !== "object") continue;
      const o = node as Record<string, unknown>;
      if (isProductType(o["@type"])) return o;
    }
  }
  return null;
}

function firstImage(images: unknown): string[] {
  if (!images) return [];
  if (typeof images === "string") {
    const u = toAbsoluteUrl(images);
    return u ? [u] : [];
  }
  if (Array.isArray(images)) {
    return images.flatMap((img) => {
      if (typeof img === "string") {
        const u = toAbsoluteUrl(img);
        return u ? [u] : [];
      }
      if (img && typeof img === "object" && "url" in img) {
        const u = toAbsoluteUrl(String((img as { url: string }).url));
        return u ? [u] : [];
      }
      return [];
    });
  }
  if (typeof images === "object" && images !== null && "url" in images) {
    const u = toAbsoluteUrl(String((images as { url: string }).url));
    return u ? [u] : [];
  }
  return [];
}

function offerPrice(product: Record<string, unknown>): {
  current?: string;
  old?: string;
  currency?: string;
} {
  const offers = product.offers;
  if (!offers) return {};
  const list = Array.isArray(offers) ? offers : [offers];
  const o = list[0];
  if (!o || typeof o !== "object") return {};
  const obj = o as Record<string, unknown>;
  const price = obj.price ?? obj.lowPrice;
  const priceStr = price != null ? String(price) : undefined;
  return {
    current: priceStr,
    currency: obj.priceCurrency != null ? String(obj.priceCurrency) : undefined,
  };
}

function h1Text(): string {
  const h1 = document.querySelector("h1");
  return h1?.textContent?.trim() ?? "";
}

/** Доп. эвристики под крупные площадки (DOM меняется — fallback к JSON-LD/OG). */
function marketplaceExtras(host: string): Partial<ItemRow> {
  const out: Partial<ItemRow> = {};
  if (host.includes("wildberries") || host.includes("wb.ru")) {
    const imgs = [
      ...document.querySelectorAll<HTMLImageElement>(
        'img[src*="wbbasket"], img[src*="basket-"], img[data-link*="photo"]',
      ),
    ]
      .map((img) => toAbsoluteUrl(img.currentSrc || img.src))
      .filter((u): u is string => Boolean(u));
    if (imgs.length) out.image_urls = imgs.slice(0, 30).join(";");
  }
  if (host.includes("ozon.ru")) {
    const priceEl = document.querySelector(
      '[data-widget="webPrice"] span, [data-widget="webPrice"]',
    );
    const t = priceEl?.textContent?.replace(/\s+/g, " ").trim();
    if (t && !out.price_current) out.price_current = t;
  }
  return out;
}

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "[…]";
}

export function scrapePage(): ItemRow {
  const source_url = location.href;
  const scraped_at = new Date().toISOString();
  const host = location.hostname;

  const ogTitle = getMeta("og:title") || "";
  const ogDesc = getMeta("og:description") || getMeta("description", "name");
  const ogImage = getMeta("og:image");
  const product = extractProductFromJsonLd();

  let title = ogTitle || h1Text() || document.title || "";
  let description = ogDesc;
  let brand = "";
  let sku = "";
  const images: string[] = [];

  if (ogImage) {
    const u = toAbsoluteUrl(ogImage);
    if (u) images.push(u);
  }

  if (product) {
    if (product.name) title = String(product.name);
    if (product.description) description = String(product.description);
    const b = product.brand;
    if (typeof b === "string") brand = b;
    else if (b && typeof b === "object" && "name" in b)
      brand = String((b as { name: string }).name);
    if (product.sku) sku = String(product.sku);
    const gtin = product.gtin13 ?? product.gtin;
    if (!sku && gtin != null) sku = String(gtin);
    images.push(...firstImage(product.image));
  }

  const seen = new Set<string>();
  const uniq = images.filter((u) => {
    if (!u || seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  const offer = product ? offerPrice(product) : {};
  let price_current =
    offer.current ||
    getMeta("product:price:amount") ||
    getMeta("og:price:amount") ||
    "";
  let currency =
    offer.currency ||
    getMeta("product:price:currency") ||
    getMeta("og:price:currency") ||
    "";

  const extra = marketplaceExtras(host);
  let image_urls = uniq.join(";");
  if (extra.image_urls) {
    const merged = [...uniq];
    for (const u of extra.image_urls.split(";")) {
      const t = u.trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        merged.push(t);
      }
    }
    image_urls = merged.join(";");
  }
  if (extra.price_current && !price_current) price_current = extra.price_current;

  const row: ItemRow = {
    source_url,
    title: title.trim(),
    description: description.trim(),
    price_current: price_current.trim(),
    price_old: "",
    currency: currency.trim(),
    brand: brand.trim(),
    sku: sku.trim(),
    size_grid: "",
    image_urls,
    category_path: "",
    scraped_at,
  };

  row.description = clip(row.description, 32700);
  return row;
}
