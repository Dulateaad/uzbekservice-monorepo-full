"use client"

import { useLanguageContext } from "@/contexts/language-context"
import { getTranslation } from "@/lib/i18n"
import { WhatsAppButton } from "./whatsapp-button"

export function Hero() {
  const { language, isClient } = useLanguageContext()

  if (!isClient) return null

  return (
    <section className="bg-gradient-to-br from-green-50 via-white to-green-50 py-20 md:py-28 px-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 right-10 w-64 h-64 bg-[#568a56] rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-[#457245] rounded-full opacity-10 blur-3xl"></div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <div className="mb-6 inline-block px-5 py-2.5 bg-green-100 rounded-full border border-green-200">
          <span className="text-[#568a56] font-semibold text-sm md:text-base">
            {getTranslation(language, "heroSubtitle")}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#568a56] mb-6 text-balance leading-tight">
          {getTranslation(language, "heroTitle")}
        </h1>

        <p className="text-lg md:text-xl text-gray-600 mb-10 text-balance max-w-2xl mx-auto leading-relaxed">
          {getTranslation(language, "heroDescription")}
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="#catalog"
            className="px-8 py-4 bg-[#568a56] text-white rounded-xl font-semibold hover:bg-[#457245] transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            {getTranslation(language, "viewCatalog")}
          </a>
          <WhatsAppButton variant="outline" />
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#568a56]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{language === "ru" ? "Без посредников" : language === "kk" ? "Делдалсыз" : "No middlemen"}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#568a56]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {language === "ru" ? "7-10 дней доставка" : language === "kk" ? "7-10 күн жеткізу" : "7-10 days delivery"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#568a56]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{language === "ru" ? "Все документы" : language === "kk" ? "Барлық құжаттар" : "All documents"}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
