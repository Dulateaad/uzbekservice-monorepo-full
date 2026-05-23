"use client"

import { useLanguageContext } from "@/contexts/language-context"
import { getTranslation } from "@/lib/i18n"

export function Benefits() {
  const { language, isClient } = useLanguageContext()

  if (!isClient) return null

  const benefits = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      titleKey: "freshness",
      descKey: "freshnessDesc",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
      titleKey: "stableSupply",
      descKey: "stableSupplyDesc",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      titleKey: "bestPrices",
      descKey: "bestPricesDesc",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      titleKey: "partnerships",
      descKey: "partnershipsDesc",
    },
  ]

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#568a56] mb-4">
            {getTranslation(language, "benefitsTitle")}
          </h2>
          <div className="h-1 w-20 bg-[#568a56] mx-auto"></div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-2xl p-8 hover:shadow-lg transition-all hover:border-[#568a56] group"
            >
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-[#568a56] mb-5 group-hover:bg-[#568a56] group-hover:text-white transition-colors">
                {benefit.icon}
              </div>
              <h3 className="text-lg font-bold text-[#568a56] mb-3">{getTranslation(language, benefit.titleKey)}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{getTranslation(language, benefit.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
