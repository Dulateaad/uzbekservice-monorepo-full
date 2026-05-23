"use client"

import { useLanguageContext } from "@/contexts/language-context"
import type { Language } from "@/lib/i18n"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageContext()

  const languages: { code: Language; label: string }[] = [
    { code: "en", label: "English" },
    { code: "kk", label: "Kazakh" },
    { code: "ru", label: "Russian" },
  ]

  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`px-3 py-1 rounded text-sm font-semibold transition-all ${
            language === lang.code
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
