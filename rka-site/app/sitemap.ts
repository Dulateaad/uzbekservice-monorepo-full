import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { newsItems } from "@/lib/content";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-static";

const base = siteUrl.replace(/\/$/, "");

const staticPaths = [
  "",
  "news",
  "documents",
  "statements",
  "about",
  "advocacy",
  "for-lawyers",
  "for-citizens",
  "chambers",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const p of staticPaths) {
      const path = p ? `/${locale}/${p}/` : `/${locale}/`;
      entries.push({
        url: `${base}${path}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: p === "" ? 1 : 0.7,
      });
    }
    for (const n of newsItems) {
      entries.push({
        url: `${base}/${locale}/news/${n.slug}/`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
