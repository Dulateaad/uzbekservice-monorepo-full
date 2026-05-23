import type { Locale } from "@/lib/i18n";
import { getUi } from "@/lib/i18n";
import { siteUrl } from "@/lib/site-url";

export function OrganizationJsonLd({ locale }: { locale: Locale }) {
  const ui = getUi(locale);
  const base = siteUrl.replace(/\/$/, "");
  const payload = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ui.siteNameLong,
    alternateName: ui.siteName,
    url: base,
    logo: `${base}/icon.svg`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Astana",
      addressCountry: "KZ",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
