import React, { useState, useEffect, useRef } from 'react';
import { Country, COUNTRIES, DEFAULT_COUNTRY } from '../../data/countries';

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (fullPhoneNumber: string, country: Country) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  defaultCountryCode?: string; // e.g. 'CO'
  className?: string;
}

export const PhoneInputWithCountry: React.FC<PhoneInputWithCountryProps> = ({
  value,
  onChange,
  id,
  name,
  placeholder,
  label,
  required = false,
  disabled = false,
  defaultCountryCode = 'CO',
  className = '',
}) => {
  // Find initial country based on phone prefix or defaultCountryCode
  const findInitialCountry = (): Country => {
    if (value && value.startsWith('+')) {
      // Find country matching dial_code
      const sortedByLength = [...COUNTRIES].sort(
        (a, b) => b.dial_code.length - a.dial_code.length
      );
      const matched = sortedByLength.find((c) => value.startsWith(c.dial_code));
      if (matched) return matched;
    }
    const defaultByCode = COUNTRIES.find(
      (c) => c.code.toUpperCase() === defaultCountryCode.toUpperCase()
    );
    return defaultByCode || DEFAULT_COUNTRY;
  };

  const [selectedCountry, setSelectedCountry] = useState<Country>(findInitialCountry);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract subscriber part without dial code
  const getSubscriberNumber = (val: string, country: Country): string => {
    if (!val) return '';
    if (val.startsWith(country.dial_code)) {
      return val.slice(country.dial_code.length).trimStart();
    }
    // If it starts with another country's +, just return whatever follows or clean value
    return val.replace(/^\+\d+\s*/, '');
  };

  const [subscriberNumber, setSubscriberNumber] = useState<string>(() =>
    getSubscriberNumber(value, selectedCountry)
  );

  // Synchronize when value changes externally
  useEffect(() => {
    if (value && value.startsWith('+')) {
      const sortedByLength = [...COUNTRIES].sort(
        (a, b) => b.dial_code.length - a.dial_code.length
      );
      const matched = sortedByLength.find((c) => value.startsWith(c.dial_code));
      if (matched && matched.code !== selectedCountry.code) {
        setSelectedCountry(matched);
        setSubscriberNumber(value.slice(matched.dial_code.length).trimStart());
        return;
      }
    }
    setSubscriberNumber(getSubscriberNumber(value, selectedCountry));
  }, [value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery('');
    const fullNumber = subscriberNumber.trim()
      ? `${country.dial_code} ${subscriberNumber.trim()}`
      : country.dial_code;
    onChange(fullNumber, country);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSubNumber = e.target.value;
    setSubscriberNumber(newSubNumber);
    const fullNumber = newSubNumber.trim()
      ? `${selectedCountry.dial_code} ${newSubNumber.trim()}`
      : '';
    onChange(fullNumber, selectedCountry);
  };

  const filteredCountries = COUNTRIES.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.name_en.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dial_code.includes(q)
    );
  });

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-black uppercase text-on-surface-variant mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {/* Country Selector Trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-3 bg-surface-container-low border border-r-0 border-outline-variant/40 rounded-l-xl text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50 select-none shrink-0"
            title={`${selectedCountry.name} (${selectedCountry.dial_code})`}
          >
            <span className="text-base leading-none" role="img" aria-label={selectedCountry.name}>
              {selectedCountry.flag}
            </span>
            <span className="font-mono text-xs font-black text-on-surface">
              {selectedCountry.dial_code}
            </span>
            <span className="material-symbols-outlined text-xs text-outline transition-transform duration-200">
              {isOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {/* Countries Dropdown Modal / Popover */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 max-h-80 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col animate-fadeIn">
              {/* Search Bar */}
              <div className="p-2.5 border-b border-outline-variant/30 bg-surface-container-low/60 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-outline">search</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar país o código (+57, Colombia...)"
                  className="w-full bg-transparent text-xs text-on-surface outline-none placeholder:text-outline"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-outline hover:text-on-surface"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Country List */}
              <div className="overflow-y-auto max-h-64 p-1 space-y-0.5">
                {filteredCountries.length === 0 ? (
                  <div className="p-4 text-center text-xs text-outline">
                    No se encontraron países
                  </div>
                ) : (
                  filteredCountries.map((c) => {
                    const isSelected = c.code === selectedCountry.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleCountrySelect(c)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-primary-fixed text-on-primary-fixed font-bold'
                            : 'hover:bg-surface-container text-on-surface'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-lg leading-none" role="img" aria-label={c.name}>
                            {c.flag}
                          </span>
                          <span className="truncate font-medium">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="font-mono text-[11px] font-bold text-outline">
                            {c.dial_code}
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-xs text-primary font-bold">
                              check
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Telephone Number Input Field */}
        <input
          type="tel"
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          value={subscriberNumber}
          onChange={handleNumberChange}
          placeholder={placeholder || selectedCountry.format || '300 123 4567'}
          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-r-xl p-3 text-sm font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface-container-lowest transition-colors"
        />
      </div>
    </div>
  );
};
