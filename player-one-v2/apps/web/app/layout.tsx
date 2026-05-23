import type { Metadata } from "next";
import "./globals.css";
import { PlayerOneProviders } from "@/components/PlayerOneProviders";

export const metadata: Metadata = {
  title: "Player One v2",
  description: "ТЗ Player One v2 — дашборд, MoCap, DNA, риски",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">
        <PlayerOneProviders>{children}</PlayerOneProviders>
      </body>
    </html>
  );
}
