import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: "Елена Громова — наставник платформы «Наставники России»",
  description:
    "Портрет наставника: опыт, результаты и вклад в команду платформы.",
  openGraph: {
    title: "Елена Громова — наставник платформы",
    description:
      "Новый наставник платформы: сертификат, результаты сопровождения участников.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
