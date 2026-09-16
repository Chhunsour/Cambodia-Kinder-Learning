import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale } from "@/types";
import { i18n, TranslationKey } from "@/lib/localization";

interface LocalizationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LocalizationContext = createContext<LocalizationContextType>({
  locale: "km",
  setLocale: () => {},
  t: (key) => key,
});

export function LocalizationProvider({ 
  children, 
  initialLocale = "km" 
}: { 
  children: ReactNode; 
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = (newLocale: Locale) => {
    i18n.setLocale(newLocale);
    setLocaleState(newLocale);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    return i18n.translate(key, params);
  };

  useEffect(() => {
    i18n.setLocale(initialLocale);
  }, [initialLocale]);

  return (
    <LocalizationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationContextType {
  return useContext(LocalizationContext);
}
