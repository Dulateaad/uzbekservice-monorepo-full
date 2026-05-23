"use client"

import { useState } from "react"
import { useLanguageContext } from "@/contexts/language-context"
import { getTranslation } from "@/lib/i18n"

export function FAQ() {
  const { language, isClient } = useLanguageContext()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  if (!isClient) return null

  const faqs = [
    { q: "faq1", a: "faq1Ans" },
    { q: "faq2", a: "faq2Ans" },
    { q: "faq3", a: "faq3Ans" },
    { q: "faq4", a: "faq4Ans" },
    { q: "faq5", a: "faq5Ans" },
    { q: "faq6", a: "faq6Ans" },
  ]

  return (
    <section id="faq" className="py-20 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-[#568a56] mb-4">{getTranslation(language, "faqTitle")}</h2>
          <div className="h-1 w-20 bg-[#568a56] mx-auto"></div>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-green-100 rounded-xl overflow-hidden bg-white hover:border-[#568a56] transition-colors"
            >
              <button
                className="w-full px-6 py-5 text-left flex justify-between items-center gap-4"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-semibold text-[#568a56]">{getTranslation(language, faq.q)}</span>
                <svg
                  className={`w-5 h-5 text-[#568a56] flex-shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5">
                  <p className="text-gray-600 leading-relaxed">{getTranslation(language, faq.a)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
