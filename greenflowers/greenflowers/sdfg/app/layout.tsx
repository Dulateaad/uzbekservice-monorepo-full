import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/contexts/language-context";
import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import { CityProvider } from "@/contexts/city-context";
import { MobileBottomNav } from "@/components/store/mobile-bottom-nav";
import "./globals.css";

const _geist = Geist({ subsets: ["latin", "latin-ext"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title:
    "Spray Flowers — Оптовые цветы из Китая | Прямые поставки без посредников",
  description:
    "Прямые поставки свежих цветов с плантаций Китая. Розы, хризантемы, гвоздики, лилии оптом. Без посредников, лучшие цены, доставка 7-10 дней. Связь через WhatsApp: +7 708 235 4533",
  keywords: [
    "оптовые цветы",
    "цветы из Китая",
    "розы оптом",
    "хризантемы оптом",
    "B2B цветы",
    "поставки цветов",
    "Куньмин цветы",
    "wholesale flowers",
    "China flowers",
  ],
  authors: [{ name: "Spray Flowers" }],
  creator: "Spray Flowers",
  publisher: "Spray Flowers",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    alternateLocale: ["en_US", "kk_KZ"],
    url: "https://sprayflowers.kz",
    siteName: "Spray Flowers",
    title: "Spray Flowers — Оптовые цветы из Китая",
    description:
      "Прямые поставки свежих цветов с плантаций Китая без посредников. WhatsApp: +7 708 235 4533",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Spray Flowers — Оптовые цветы из Китая",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spray Flowers — Оптовые цветы из Китая",
    description:
      "Прямые поставки свежих цветов с плантаций Китая без посредников",
  },
  generator: "v0.app",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#568a56",
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" translate="no" data-scroll-behavior="smooth">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Language" content="ru" />
        <meta name="language" content="Russian" />
        <meta name="google" content="notranslate" />
        <meta httpEquiv="content-language" content="ru" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        {/* Firebase Phone Auth (invisible reCAPTCHA) */}
        <div
          id="gf-recaptcha-container"
          className="fixed left-0 top-0 -z-10 h-px w-px overflow-hidden opacity-0"
          aria-hidden
        />
        <AuthProvider>
          <CartProvider>
            <CityProvider>
              <LanguageProvider>
                <div style={{ paddingBottom: "70px" }}>{children}</div>
                <MobileBottomNav />
              </LanguageProvider>
            </CityProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
