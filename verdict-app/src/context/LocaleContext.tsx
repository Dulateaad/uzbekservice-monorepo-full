import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type Locale, translations } from '@/i18n/translations';

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (typeof translations)['en'];
}

const LocaleContext = createContext<LocaleContextType | null>(null);

const STORAGE_KEY = 'verdict-locale';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    return saved && ['en', 'ru', 'zh'].includes(saved) ? saved : 'en';
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = translations[locale] as (typeof translations)['en'];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
