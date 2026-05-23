"use client"

import { useState, useEffect } from "react"
import type { Language } from "@/lib/i18n"

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("en")
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const stored = (localStorage.getItem("language") as Language) || "en"
    setLanguage(stored)
  }, [])

  const setLang = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  return { language, setLanguage: setLang, isClient }
}
