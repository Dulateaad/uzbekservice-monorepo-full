import type { Metadata } from "next";
import { Merriweather, Source_Sans_3 } from "next/font/google";
import { defaultLocale } from "@/lib/i18n";
import { siteUrl } from "@/lib/site-url";
import { DocLang } from "@/components/doc-lang";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin", "cyrillic-ext"],
  variable: "--font-source",
});

const display = Merriweather({
  weight: ["400", "700"],
  subsets: ["latin", "cyrillic"],
  variable: "--font-display-merri",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "РКА",
    template: "%s · РКА",
  },
  icons: { icon: "/icon.svg" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={defaultLocale} className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <DocLang />
        {children}
      </body>
    </html>
  );
}
