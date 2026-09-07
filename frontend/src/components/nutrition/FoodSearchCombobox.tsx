import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { searchFoodCatalog } from '../../services/dataService';
import { FoodItem } from '../../types';

export interface FoodSearchComboboxProps {
  onAddFood: (food: FoodItem, grams: number) => void;
  placeholder?: string;
  className?: string;
  defaultGrams?: number;
}

function formatNutrient(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return Number(value).toLocaleString('es-CO', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function categoryLabel(food: FoodItem): string {
  const id = (food.id || '').toLowerCase();
  const name = (food.name || '').toLowerCase();
  if (/pollo|carne|pescado|huevo|lenteja|frijol|garbanzo|res|cerdo/.test(name + id)) {
    return 'Proteína';
  }
  if (/arroz|arepa|pan|avena|papa|pasta|maíz|maiz/.test(name + id)) return 'Cereal';
  if (/leche|yogurt|yogur|queso/.test(name + id)) return 'Lácteo';
  if (/aceite|aguacate|nuez|almendra/.test(name + id)) return 'Grasa';
  if (/manzana|banano|naranja|fruta|plátano|platano/.test(name + id)) return 'Fruta';
  if (/verdura|brócoli|brocoli|espinaca|lechuga|zanahoria/.test(name + id)) return 'Verdura';
  return 'TCA 2018';
}

export const FoodSearchCombobox: React.FC<FoodSearchComboboxProps> = ({
  onAddFood,
  placeholder = 'Buscar alimento en la TCA (ej. lenteja, pollo, plátano)...',
  className = '',
  defaultGrams = 100,
}) => {
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState(String(defaultGrams));
  const [menuBox, setMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const updateMenuPosition = () => {
    const el = inputWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const top = rect.bottom + gap;
    const maxAvailable = Math.max(120, window.innerHeight - top - 12);
    setMenuBox({
      top,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(288, maxAvailable),
    });
  };

  useLayoutEffect(() => {
    if (!isOpen || selected) {
      setMenuBox(null);
      return;
    }
    updateMenuPosition();
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [isOpen, selected, results.length, query]);

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
        setIsOpen(true);
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
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setIsOpen(false);
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

  const showDropdown =
    isOpen && !selected && Boolean(query.trim()) && (isLoading || results.length >= 0);

  const dropdown =
    showDropdown && menuBox
      ? createPortal(
          <ul
            ref={listRef}
            role="listbox"
            className="fixed z-[80] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl custom-scrollbar"
            style={{
              top: menuBox.top,
              left: menuBox.left,
              width: menuBox.width,
              maxHeight: menuBox.maxHeight,
            }}
          >
            {isLoading && results.length === 0 ? (
              <li className="flex items-center gap-2 px-4 py-4 text-xs text-slate-500">
                <span className="material-symbols-outlined animate-spin text-sky-600 text-base">
                  progress_activity
                </span>
                Buscando en el catálogo…
              </li>
            ) : results.length === 0 ? (
              <li className="px-4 py-4 text-xs text-slate-500 text-center">
                No se encontraron alimentos con ese nombre
              </li>
            ) : (
              results.map((food, index) => {
                const active = index === highlightedIndex;
                return (
                  <li key={food.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => handlePick(food)}
                      className={`w-full text-left p-3 border-b border-slate-100 last:border-0 transition-colors cursor-pointer rounded-none first:rounded-t-xl last:rounded-b-xl ${
                        active
                          ? 'bg-blue-50 dark:bg-slate-800'
                          : 'hover:bg-blue-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-800 dark:text-slate-100 text-sm leading-snug">
                          {food.name}
                        </p>
                        <span className="shrink-0 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                          {categoryLabel(food)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        <span className="font-bold text-sky-700 tabular-nums">
                          {formatNutrient(food.energy_kcal, 0)} kcal
                          <span className="font-medium text-slate-400 ml-1">/100g</span>
                        </span>
                        <span className="text-blue-700 font-semibold tabular-nums">
                          P: {formatNutrient(food.protein_g)} g
                        </span>
                        <span className="text-emerald-700 font-semibold tabular-nums">
                          C: {formatNutrient(food.carbs_total_g)} g
                        </span>
                        <span className="text-amber-700 font-semibold tabular-nums">
                          G: {formatNutrient(food.lipids_g)} g
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={`relative w-full overflow-visible ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        Buscar alimento
      </label>
      <div className="flex flex-col sm:flex-row gap-2 overflow-visible">
        <div ref={inputWrapRef} className="relative flex-1 overflow-visible">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
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
              if (query.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
          />
          {isLoading && (
            <span className="material-symbols-outlined animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-sky-600 text-base">
              progress_activity
            </span>
          )}
        </div>

        {selected && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              g
              <input
                type="number"
                min={1}
                step={1}
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-black text-slate-800"
              />
            </label>
            <button
              type="button"
              disabled={!canAdd}
              onClick={handleAdd}
              className="inline-flex items-center gap-1 rounded-xl bg-sky-600 hover:bg-sky-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Agregar
            </button>
          </div>
        )}
      </div>

      {dropdown}
    </div>
  );
};

export default FoodSearchCombobox;
