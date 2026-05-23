"use client";

import { useLanguageContext } from "@/contexts/language-context";
import Image from "next/image";

export function AboutSection() {
  const { language, isClient } = useLanguageContext();

  if (!isClient) return null;

  const content = {
    ru: {
      title: "О компании",
      text: `Добро пожаловать в Spray Flowers — платформу прямых оптовых поставок цветов из Китая.

Мы сотрудничаем напрямую с крупнейшими плантациями, без участия посредников.

Благодаря этому наши партнёры получают свежие цветы, стабильную логистику и честную цену, основанную исключительно на реальной стоимости товара.`,
    },
    en: {
      title: "About Us",
      text: `Welcome to Spray Flowers — a platform for direct wholesale flower supplies from China.

We work directly with the largest plantations, without intermediaries.

Thanks to this, our partners receive fresh flowers, stable logistics, and fair prices based solely on the actual cost of goods.`,
    },
    kk: {
      title: "Біз туралы",
      text: `Spray Flowers-қа қош келдіңіз — Қытайдан гүлдерді тікелей көтерме жеткізу платформасы.

Біз делдалсыз ең ірі плантациялармен тікелей жұмыс істейміз.

Осының арқасында біздің серіктестер таза гүлдер, тұрақты логистика және тауардың нақты құнына ғана негізделген әділ бағаны алады.`,
    },
  };

  const currentContent = content[language] || content.ru;

  return (
    <section id="about" className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-[#568a56] mb-4">
            {currentContent.title}
          </h2>
          <div className="h-1 w-20 bg-[#568a56] mx-auto"></div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="w-48 h-48 md:w-64 md:h-64 bg-green-50 rounded-2xl flex items-center justify-center p-6 border border-green-100">
              <Image
                src="/logo.png"
                alt="Spray Flowers"
                width={200}
                height={200}
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Text */}
          <div className="flex-1">
            <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-8 border border-green-100">
              {currentContent.text.split("\n\n").map((paragraph, index) => (
                <p
                  key={index}
                  className="text-gray-700 text-lg leading-relaxed mb-4 last:mb-0"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
