import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../app/providers/I18nProvider';
import { Locale } from '../../i18n/translations';

interface LanguageSelectorProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { locale, setLocale, availableLocales } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLocale = availableLocales.find((l) => l.code === locale) || availableLocales[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: Locale) => {
    setLocale(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id="btn-language-selector"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/40 text-xs font-bold text-on-surface transition-all cursor-pointer shadow-2xs select-none"
        title="Cambiar idioma / Change language / Mudar idioma"
      >
        <span className="text-sm leading-none" role="img" aria-label={activeLocale.label}>
          {activeLocale.flag}
        </span>
        <span className="uppercase text-[11px] font-extrabold tracking-wider">
          {variant === 'compact' ? activeLocale.code : activeLocale.nativeLabel}
        </span>
        <span className="material-symbols-outlined text-xs text-outline transition-transform duration-200">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-40 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xl z-50 p-1 space-y-0.5 animate-fadeIn">
          <div className="px-2.5 py-1 text-[10px] font-black uppercase text-outline tracking-wider">
            Idioma / Language
          </div>
          {availableLocales.map((item) => {
            const isSelected = item.code === locale;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-primary-fixed text-on-primary-fixed font-bold'
                    : 'hover:bg-surface-container text-on-surface'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none" role="img" aria-label={item.label}>
                    {item.flag}
                  </span>
                  <span>{item.nativeLabel}</span>
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-xs text-primary font-bold">
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
