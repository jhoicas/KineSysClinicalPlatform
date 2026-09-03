import React, { useEffect, useId, useRef, useState } from 'react';
import { searchFoodCatalog } from '../../services/dataService';
import { FoodItem } from '../../types';

export interface FoodSearchComboboxProps {
  onAddFood: (food: FoodItem, grams: number) => void;
  placeholder?: string;
  className?: string;
  defaultGrams?: number;
}

export const FoodSearchCombobox: React.FC<FoodSearchComboboxProps> = ({
  onAddFood,
  placeholder = 'Buscar alimento en la TCA (ej. lenteja, pollo, plátano)...',
  className = '',
  defaultGrams = 100,
}) => {
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState(String(defaultGrams));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (selected) return;
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await searchFoodCatalog(trimmed);
        setResults(rows);
        setIsOpen(true);
        setHighlightedIndex(rows.length > 0 ? 0 : -1);
      } catch (err) {
        console.error('Error buscando alimentos TCA:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handlePick = (food: FoodItem) => {
    setSelected(food);
    setQuery(food.name);
    setIsOpen(false);
    setResults([]);
    setGrams(String(defaultGrams));
  };

  const parsedGrams = Number(grams);
  const canAdd = Boolean(selected) && Number.isFinite(parsedGrams) && parsedGrams > 0;

  const handleAdd = () => {
    if (!selected || !canAdd) return;
    onAddFood(selected, parsedGrams);
    setSelected(null);
    setQuery('');
    setGrams(String(defaultGrams));
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && results[highlightedIndex]) {
        handlePick(results[highlightedIndex]);
      } else if (canAdd) {
        handleAdd();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        Buscar alimento
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            restaurant
          </span>
          <input
            id={inputId}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setSelected(null);
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low pl-10 pr-3 py-2.5 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {isLoading && (
            <span className="material-symbols-outlined animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary text-base">
              sync
            </span>
          )}
        </div>

        {selected && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
              g
              <input
                type="number"
                min={1}
                step={1}
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="w-20 rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-2 py-2 text-sm font-black text-on-surface"
              />
            </label>
            <button
              type="button"
              disabled={!canAdd}
              onClick={handleAdd}
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Agregar
            </button>
          </div>
        )}
      </div>

      {isOpen && !selected && (results.length > 0 || (query.trim() && !isLoading)) && (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-2xl border border-outline-variant/30 bg-surface-container-lowest clinical-shadow">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-xs text-on-surface-variant">Sin coincidencias en el catálogo TCA.</li>
          ) : (
            results.map((food, index) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => handlePick(food)}
                  className={`w-full text-left px-3 py-2.5 text-xs ${
                    index === highlightedIndex ? 'bg-primary/10' : 'hover:bg-surface-container-low'
                  }`}
                >
                  <p className="font-bold text-on-surface">{food.name}</p>
                  <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                    {food.id} · {food.energy_kcal ?? '—'} kcal / 100 g · P {food.protein_g ?? '—'}g · G{' '}
                    {food.lipids_g ?? '—'}g · C {food.carbs_total_g ?? '—'}g
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
