"use client"

import { useLanguageContext } from "@/contexts/language-context"
import { getTranslation } from "@/lib/i18n"

export function Categories() {
  const { language, isClient } = useLanguageContext()

  if (!isClient) return null

  const categories = [
    {
      nameKey: "roses",
      color: "from-red-50 to-rose-100",
      borderColor: "border-red-200",
      image: "/red-roses-icon.jpg",
    },
    {
      nameKey: "chrysanthemums",
      color: "from-yellow-50 to-amber-100",
      borderColor: "border-yellow-200",
      image: "/yellow-chrysanthemum-icon.jpg",
    },
    {
      nameKey: "carnations",
      color: "from-pink-50 to-rose-100",
      borderColor: "border-pink-200",
      image: "/pink-carnation-icon.jpg",
    },
    {
      nameKey: "gypsophila",
      color: "from-gray-50 to-slate-100",
      borderColor: "border-gray-200",
      image: "/white-gypsophila-baby-breath-icon.jpg",
    },
    {
      nameKey: "lilies",
      color: "from-orange-50 to-amber-100",
      borderColor: "border-orange-200",
      image: "/lily-flower-icon.jpg",
    },
    {
      nameKey: "gerberas",
      color: "from-orange-50 to-red-100",
      borderColor: "border-orange-200",
      image: "/gerbera-daisy-colorful-icon.jpg",
    },
  ]

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-[#568a56] mb-4">
            {getTranslation(language, "categoriesTitle")}
          </h2>
          <div className="h-1 w-20 bg-[#568a56] mx-auto"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat, i) => (
            <a key={i} href="#catalog" className="group">
              <div
                className={`bg-gradient-to-br ${cat.color} p-5 rounded-2xl text-center hover:shadow-lg transition-all group-hover:scale-105 border ${cat.borderColor}`}
              >
                <img
                  src={cat.image || "/placeholder.svg"}
                  alt={getTranslation(language, cat.nameKey)}
                  className="w-16 h-16 mx-auto mb-3 object-contain"
                  loading="lazy"
                />
                <h3 className="font-bold text-[#568a56] text-sm">{getTranslation(language, cat.nameKey)}</h3>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
