import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, TRANSLATIONS } from '../../i18n/translations';
import { Country, COUNTRIES, DEFAULT_COUNTRY } from '../../data/countries';

export interface LocaleOption {
  code: Locale;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const AVAILABLE_LOCALES: LocaleOption[] = [
  { code: 'es', label: 'Español', nativeLabel: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', nativeLabel: 'Português', flag: '🇧🇷' },
];

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  selectedCountry: Country;
  setSelectedCountry: (country: Country) => void;
  t: (key: string, fallback?: string) => string;
  availableLocales: LocaleOption[];
  countries: Country[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('kinesys_locale') as Locale;
    if (saved && ['es', 'en', 'pt'].includes(saved)) {
      return saved;
    }
    return 'es';
  });

  const [selectedCountry, setSelectedCountryState] = useState<Country>(() => {
    const savedCode = localStorage.getItem('kinesys_country_code');
    if (savedCode) {
      const found = COUNTRIES.find((c) => c.code.toUpperCase() === savedCode.toUpperCase());
      if (found) return found;
    }
    return DEFAULT_COUNTRY; // Colombia (+57)
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('kinesys_locale', newLocale);
    document.documentElement.lang = newLocale;
  };

  const setSelectedCountry = (newCountry: Country) => {
    setSelectedCountryState(newCountry);
    localStorage.setItem('kinesys_country_code', newCountry.code);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string, fallback?: string): string => {
    const currentDict = TRANSLATIONS[locale] || TRANSLATIONS.es;
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    // Fallback to Spanish dictionary
    if (TRANSLATIONS.es && TRANSLATIONS.es[key]) {
      return TRANSLATIONS.es[key];
    }
    return fallback || key;
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        selectedCountry,
        setSelectedCountry,
        t,
        availableLocales: AVAILABLE_LOCALES,
        countries: COUNTRIES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
