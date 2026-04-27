
import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/toaster";
import { MobileNav } from "@/components/MobileNav";
import { CartProvider } from "@/context/cart-context";
import Script from "next/script";
import { FirebaseClientProvider } from "@/firebase";
import { PrivacyGuard } from "@/components/PrivacyGuard";
import { TelegramWebAppInit } from "@/components/TelegramWebAppInit";

export const metadata: Metadata = {
  title: "Dress with intuition",
  description: "Your personal AI stylist.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dress with intuition",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#FFFFFF" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("font-body antialiased flex flex-col min-h-screen")}>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <TelegramWebAppInit />
        <div className="glow-spot-1"></div>
        <div className="glow-spot-2"></div>
        <div className="glow-spot-3"></div>
        <FirebaseClientProvider>
          <CartProvider>
            <PrivacyGuard>
              <Header />
              <main className="flex-grow pb-24 md:pb-0">{children}</main>
              <MobileNav />
              <Toaster />
            </PrivacyGuard>
          </CartProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
